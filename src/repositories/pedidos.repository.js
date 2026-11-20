import { pool } from '../config/baseDatos.js';

const columnas = `p.id, p.numero, p.usuario_id AS "clienteId", p.nombre_contacto AS nombre,
  p.apellidos_contacto AS apellidos, p.correo_contacto AS correo, p.direccion,
  p.zona_id AS "zonaId", z.nombre AS "zonaNombre", z.tiempo_estimado AS "tiempoEstimado",
  p.tipo_cliente AS "tipoCliente", p.total, p.estado, p.repartidor_id AS "repartidorId",
  p.repartidor_nombre AS repartidor, p.cobrado_en AS "cobradoEn",
  p.creado_en AS "fechaCreacion", p.actualizado_en AS "fechaActualizacion"`;

const seleccion = `SELECT ${columnas}, COALESCE((SELECT jsonb_agg(jsonb_build_object(
  'codigo',l.producto_codigo,'nombre',pr.nombre,'cantidad',l.cantidad,
  'precioUnitario',l.precio_unitario,'subtotal',l.precio_unitario*l.cantidad) ORDER BY l.producto_codigo)
  FROM linea_pedido l JOIN producto pr ON pr.codigo=l.producto_codigo WHERE l.pedido_id=p.id),'[]'::jsonb) AS lineas
  FROM pedido p JOIN zona_despacho z ON z.id=p.zona_id`;

export async function obtener(id, db = pool) {
  const { rows } = await db.query(`${seleccion} WHERE p.id=$1`, [id]);
  return rows[0] ?? null;
}

export async function listar(actor) {
  let filtro = '';
  const valores = [];
  if (actor.rol === 'cliente') { filtro = 'WHERE p.usuario_id=$1'; valores.push(actor.id); }
  if (actor.rol === 'repartidor') { filtro = 'WHERE p.repartidor_id=$1'; valores.push(actor.id); }
  const { rows } = await pool.query(`${seleccion} ${filtro} ORDER BY p.creado_en DESC,p.id DESC`, valores);
  return rows;
}

export async function insertar(db, datos, usuarioId, tipoCliente, total) {
  const { rows } = await db.query(`INSERT INTO pedido (usuario_id,nombre_contacto,apellidos_contacto,
    correo_contacto,direccion,zona_id,tipo_cliente,total) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
  [usuarioId, datos.nombre, datos.apellidos, datos.correo, datos.direccion, datos.zonaId, tipoCliente, total]);
  return rows[0].id;
}
