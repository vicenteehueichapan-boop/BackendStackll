import { ErrorApi } from '../errores/ErrorApi.js';
import * as productosRepository from '../repositories/productos.repository.js';
import * as gestion from '../repositories/gestionProductos.repository.js';

function traducirError(error) {
  if (error.code === '23505') throw new ErrorApi(409, 'CODIGO_EXISTENTE', 'El código ya existe.');
  if (error.code === '23502') throw new ErrorApi(400, 'VALIDACION', 'La categoría no existe.', { categoria: 'Selecciona una categoría del catálogo.' });
  if (['23503', '23001'].includes(error.code)) throw new ErrorApi(409, 'PRODUCTO_EN_USO', 'El producto tiene pedidos y no se puede eliminar.');
  throw error;
}

export async function crearProducto(datos) {
  try { await gestion.crear(datos); } catch (error) { traducirError(error); }
  return obtenerProducto(datos.codigo);
}

export async function actualizarProducto(codigo, datos) {
  if (codigo !== datos.codigo) throw new ErrorApi(400, 'VALIDACION', 'El código del producto no se puede cambiar.');
  try {
    if (!await gestion.guardar(codigo, datos)) throw new ErrorApi(404, 'PRODUCTO_NO_ENCONTRADO', 'El producto no existe.');
  } catch (error) { traducirError(error); }
  return obtenerProducto(codigo);
}

export async function eliminarProducto(codigo) {
  try {
    if (!(await gestion.eliminar(codigo)).rowCount) throw new ErrorApi(404, 'PRODUCTO_NO_ENCONTRADO', 'El producto no existe.');
  } catch (error) { traducirError(error); }
}

export function listarCatalogo(filtros) {
  return productosRepository.listarActivos(filtros);
}

export async function obtenerProducto(codigo) {
  const producto = await productosRepository.buscarActivoPorCodigo(codigo);
  if (!producto) throw new ErrorApi(404, 'PRODUCTO_NO_ENCONTRADO', 'No existe un producto activo con ese código.');
  return producto;
}
