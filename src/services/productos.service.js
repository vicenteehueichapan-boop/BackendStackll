import { ErrorApi } from '../errores/ErrorApi.js';
import * as productosRepository from '../repositories/productos.repository.js';

export function listarCatalogo(filtros) {
  return productosRepository.listarActivos(filtros);
}

export async function obtenerProducto(codigo) {
  const producto = await productosRepository.buscarActivoPorCodigo(codigo);
  if (!producto) throw new ErrorApi(404, 'PRODUCTO_NO_ENCONTRADO', 'No existe un producto activo con ese código.');
  return producto;
}
