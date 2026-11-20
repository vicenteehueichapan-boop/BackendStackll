import { consultar, enTransaccion } from '../config/baseDatos.js';
import { ErrorApi } from '../errores/ErrorApi.js';
import * as repositorio from '../repositories/gestionUsuarios.repository.js';
import { hashearContrasena } from '../security/contrasenas.js';

export const listarUsuarios = repositorio.listar;

export async function crearPersonal(datos) {
  const hash = await hashearContrasena(datos.contrasena);
  try {
    return await enTransaccion((db) => repositorio.crear(db, datos, hash));
  } catch (error) {
    if (error.code === '23505') throw new ErrorApi(409, 'CORREO_EXISTENTE', 'Ese correo ya está registrado.');
    throw error;
  }
}

export async function obtenerUsuario(id, actor) {
  if (actor.rol !== 'administracion' && actor.id !== id) {
    throw new ErrorApi(403, 'PERMISO_DENEGADO', 'Solo puedes consultar tu propia cuenta.');
  }
  const { rows } = await consultar(`SELECT ${repositorio.columnasUsuario} FROM usuario WHERE id=$1`, [id]);
  if (!rows[0]) throw new ErrorApi(404, 'USUARIO_NO_ENCONTRADO', 'El usuario no existe.');
  return rows[0];
}

export async function modificarUsuario(id, cambios) {
  try {
    return await enTransaccion(async (db) => {
      // Serializa cambios de rol/estado: dos administradores no pueden desactivarse a la vez.
      await db.query('SELECT pg_advisory_xact_lock(1104, 3)');
      const actual = await repositorio.bloquear(db, id);
      if (!actual) throw new ErrorApi(404, 'USUARIO_NO_ENCONTRADO', 'El usuario no existe.');
      const nuevo = { ...actual, ...cambios };
      // Un cliente conserva su perfil; el alta pública es la única que crea ese rol.
      if ((actual.rol === 'cliente') !== (nuevo.rol === 'cliente')) {
        throw new ErrorApi(409, 'ROL_INCOMPATIBLE', 'Una cuenta de cliente no se convierte en personal ni a la inversa.');
      }
      if (actual.rol === 'administracion' && actual.estado === 'activo'
          && (nuevo.rol !== 'administracion' || nuevo.estado !== 'activo')) {
        const { rows } = await db.query("SELECT count(*) AS cantidad FROM usuario WHERE rol='administracion' AND estado='activo' AND id<>$1", [id]);
        if (Number(rows[0].cantidad) === 0) throw new ErrorApi(409, 'ULTIMO_ADMINISTRADOR', 'Debe quedar un administrador activo.');
      }
      if (actual.rol === 'repartidor' && (nuevo.rol !== 'repartidor' || nuevo.estado !== 'activo')) {
        const { rowCount } = await db.query("SELECT 1 FROM pedido WHERE repartidor_id=$1 AND estado<>'entregado' LIMIT 1", [id]);
        if (rowCount) throw new ErrorApi(409, 'ENTREGAS_PENDIENTES', 'El repartidor aún tiene entregas pendientes.');
      }
      return repositorio.modificar(db, id, nuevo);
    });
  } catch (error) {
    if (error.code === '23505') throw new ErrorApi(409, 'CORREO_EXISTENTE', 'Ese correo ya está registrado.');
    throw error;
  }
}
