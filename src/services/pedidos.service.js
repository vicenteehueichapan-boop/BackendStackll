import { enTransaccion, consultar } from '../config/baseDatos.js';
import { ErrorApi } from '../errores/ErrorApi.js';
import * as repositorio from '../repositories/pedidos.repository.js';

export const listarPedidos = repositorio.listar;

function comprobarPropiedad(pedido, actor) {
  if (!pedido) throw new ErrorApi(404, 'PEDIDO_NO_ENCONTRADO', 'El pedido no existe.');
  if ((actor.rol === 'cliente' && pedido.clienteId !== actor.id)
    || (actor.rol === 'repartidor' && pedido.repartidorId !== actor.id)) {
    throw new ErrorApi(403, 'PERMISO_DENEGADO', 'No tienes permiso para acceder a ese pedido.');
  }
}

export async function obtenerPedido(id, actor) {
  const pedido = await repositorio.obtener(id);
  comprobarPropiedad(pedido, actor);
  return pedido;
}

export async function crearPedido(datos, actor) {
  try {
    return await enTransaccion(async (db) => {
      const perfil = await db.query('SELECT tipo_cliente FROM perfil_cliente WHERE usuario_id=$1 FOR SHARE', [actor.id]);
      const tipoCliente = perfil.rows[0]?.tipo_cliente;
      if (!tipoCliente) throw new ErrorApi(409, 'PERFIL_INCOMPLETO', 'La cuenta no tiene perfil de cliente.');
      const codigos = datos.lineas.map((linea) => linea.codigo).sort();
      // Orden constante y bloqueo antes de calcular: evita sobreventa y bloqueos cruzados.
      const { rows: productos } = await db.query("SELECT * FROM producto WHERE codigo=ANY($1::text[]) AND estado='activo' ORDER BY codigo FOR UPDATE", [codigos]);
      if (productos.length !== codigos.length) throw new ErrorApi(409, 'CATALOGO_CAMBIO', 'Un producto ya no está disponible. Revisa el carrito.');
      let total = 0;
      const lineas = productos.map((producto) => {
        const linea = datos.lineas.find((item) => item.codigo === producto.codigo);
        const precio = tipoCliente === 'comercial' ? producto.precio_comercial : producto.precio_residencial;
        if (linea.precioEsperado !== precio) throw new ErrorApi(409, 'PRECIO_CAMBIO', 'El precio cambió. Revisa el resumen antes de confirmar.');
        if (producto.stock < linea.cantidad) throw new ErrorApi(409, 'STOCK_INSUFICIENTE', `No hay stock suficiente de ${producto.nombre}.`);
        total += precio * linea.cantidad;
        return { ...linea, precio };
      });
      if (total > 2147483647) throw new ErrorApi(400, 'TOTAL_FUERA_DE_RANGO', 'El total supera el máximo permitido.');
      const id = await repositorio.insertar(db, datos, actor.id, tipoCliente, total);
      for (const linea of lineas) {
        await db.query('INSERT INTO linea_pedido (pedido_id,producto_codigo,cantidad,precio_unitario) VALUES ($1,$2,$3,$4)', [id, linea.codigo, linea.cantidad, linea.precio]);
        await db.query('UPDATE producto SET stock=stock-$2, actualizado_en=now() WHERE codigo=$1', [linea.codigo, linea.cantidad]);
      }
      return repositorio.obtener(id, db);
    });
  } catch (error) {
    if (error.code === '23503') throw new ErrorApi(400, 'VALIDACION', 'La zona de despacho no existe.', { zonaId: 'Selecciona una zona válida.' });
    throw error;
  }
}

async function bloquearPedido(db, id, actor) {
  await db.query('SELECT id FROM pedido WHERE id=$1 FOR UPDATE', [id]);
  const pedido = await repositorio.obtener(id, db);
  comprobarPropiedad(pedido, actor);
  return pedido;
}

export async function asignarRepartidor(id, repartidorId, actor) {
  return enTransaccion(async (db) => {
    // El mismo orden de bloqueo que la gestión de usuarios evita asignar a quien se desactiva.
    await db.query('SELECT pg_advisory_xact_lock(1104, 3)');
    const pedido = await bloquearPedido(db, id, actor);
    if (pedido.estado !== 'pendiente') throw new ErrorApi(409, 'ESTADO_INVALIDO', 'Solo se asignan pedidos pendientes.');
    const { rows } = await db.query("SELECT nombre, apellidos FROM usuario WHERE id=$1 AND rol='repartidor' AND estado='activo' FOR SHARE", [repartidorId]);
    if (!rows[0]) throw new ErrorApi(409, 'REPARTIDOR_NO_DISPONIBLE', 'Selecciona un repartidor activo.');
    await db.query("UPDATE pedido SET repartidor_id=$2,repartidor_nombre=$3,estado='asignado',actualizado_en=now() WHERE id=$1",
      [id, repartidorId, `${rows[0].nombre} ${rows[0].apellidos}`]);
    return repositorio.obtener(id, db);
  });
}

export async function cambiarEstado(id, estado, actor) {
  return enTransaccion(async (db) => {
    const pedido = await bloquearPedido(db, id, actor);
    if (estado === 'en_camino' && !pedido.repartidorId) {
      throw new ErrorApi(409, 'SIN_REPARTIDOR', 'Un pedido no pasa a en camino sin repartidor asignado.');
    }
    if (!((pedido.estado === 'asignado' && estado === 'en_camino') || (pedido.estado === 'en_camino' && estado === 'entregado'))) {
      throw new ErrorApi(409, 'ESTADO_INVALIDO', 'El cambio no respeta la secuencia del pedido.');
    }
    await db.query("UPDATE pedido SET estado=$2,cobrado_en=CASE WHEN $2='entregado' THEN now() ELSE NULL END,actualizado_en=now() WHERE id=$1", [id, estado]);
    return repositorio.obtener(id, db);
  });
}

export async function eliminarPedido(id, actor) {
  await enTransaccion(async (db) => {
    const pedido = await bloquearPedido(db, id, actor);
    if (pedido.estado !== 'pendiente') throw new ErrorApi(409, 'PEDIDO_EN_CURSO', 'Solo se elimina un pedido pendiente sin asignar.');
    // Devuelve el stock de la reserva, sin borrar entregas ni sus cobros.
    for (const linea of pedido.lineas) {
      await db.query('UPDATE producto SET stock=stock+$2,actualizado_en=now() WHERE codigo=$1', [linea.codigo, linea.cantidad]);
    }
    await db.query('DELETE FROM pedido WHERE id=$1', [id]);
  });
}

export async function listarRepartidores() {
  const { rows } = await consultar("SELECT id,nombre,apellidos FROM usuario WHERE rol='repartidor' AND estado='activo' ORDER BY nombre,id");
  return rows;
}
