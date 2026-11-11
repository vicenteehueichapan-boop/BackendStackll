import { consultar } from '../config/baseDatos.js';

const COLUMNAS = `p.codigo, p.nombre, p.descripcion, p.unidad, c.nombre AS categoria,
  p.precio_residencial AS "precioResidencial", p.precio_comercial AS "precioComercial",
  p.stock, p.destacado`;

// Catálogo público: solo productos activos. Máximo 100 filas (el catálogo del caso tiene 14).
export async function listarActivos({ busqueda, categoria }) {
  const condiciones = [`p.estado = 'activo'`];
  const valores = [];
  if (busqueda) {
    // % y _ escritos por el usuario se buscan como texto, no como comodines.
    valores.push(`%${busqueda.replace(/[\\%_]/g, '\\$&')}%`);
    condiciones.push(`(p.nombre ILIKE $${valores.length} OR p.codigo ILIKE $${valores.length} OR p.descripcion ILIKE $${valores.length})`);
  }
  if (categoria) {
    valores.push(categoria);
    condiciones.push(`c.nombre = $${valores.length}`);
  }
  const { rows } = await consultar(
    `SELECT ${COLUMNAS} FROM producto p JOIN categoria c ON c.id = p.categoria_id
      WHERE ${condiciones.join(' AND ')} ORDER BY p.codigo LIMIT 100`,
    valores,
  );
  return rows;
}

export async function buscarActivoPorCodigo(codigo) {
  const { rows } = await consultar(
    `SELECT ${COLUMNAS} FROM producto p JOIN categoria c ON c.id = p.categoria_id
      WHERE p.codigo = $1 AND p.estado = 'activo'`,
    [codigo],
  );
  return rows[0];
}
