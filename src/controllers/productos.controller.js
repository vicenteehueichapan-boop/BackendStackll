import { esquemaCodigoProducto, esquemaFiltrosProductos } from '../schemas/productos.schemas.js';
import * as productosService from '../services/productos.service.js';

export async function listar(req, res) {
  const filtros = esquemaFiltrosProductos.parse(req.query);
  res.status(200).json(await productosService.listarCatalogo(filtros));
}

export async function detalle(req, res) {
  const { codigo } = esquemaCodigoProducto.parse(req.params);
  res.status(200).json(await productosService.obtenerProducto(codigo));
}
