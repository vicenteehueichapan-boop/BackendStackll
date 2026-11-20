import { consultar } from '../config/baseDatos.js';

export async function guardar(codigo, datos) {
  const valores = [codigo, datos.nombre, datos.descripcion, datos.unidad, datos.categoria,
    datos.precioResidencial, datos.precioComercial, datos.stock, datos.destacado];
  const { rowCount } = await consultar(`UPDATE producto SET nombre=$2, descripcion=$3, unidad=$4,
    categoria_id=(SELECT id FROM categoria WHERE nombre=$5), precio_residencial=$6,
    precio_comercial=$7, stock=$8, destacado=$9, actualizado_en=now() WHERE codigo=$1 AND estado='activo'`, valores);
  return rowCount;
}

export async function crear(datos) {
  await consultar(`INSERT INTO producto (codigo,nombre,descripcion,unidad,categoria_id,precio_residencial,precio_comercial,stock,destacado)
    VALUES ($1,$2,$3,$4,(SELECT id FROM categoria WHERE nombre=$5),$6,$7,$8,$9)`,
  [datos.codigo, datos.nombre, datos.descripcion, datos.unidad, datos.categoria, datos.precioResidencial,
    datos.precioComercial, datos.stock, datos.destacado]);
}

export async function eliminar(codigo) {
  return consultar("DELETE FROM producto WHERE codigo=$1 AND estado='activo'", [codigo]);
}
