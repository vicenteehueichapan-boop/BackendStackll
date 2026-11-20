import { esquemaCodigoProducto, esquemaFiltrosProductos, esquemaProducto } from '../schemas/productos.schemas.js';
import * as productosService from '../services/productos.service.js';

export async function listar(req, res) {
  const filtros = esquemaFiltrosProductos.parse(req.query);
  res.status(200).json(await productosService.listarCatalogo(filtros));
}

export async function detalle(req, res) {
  const { codigo } = esquemaCodigoProducto.parse(req.params);
  res.status(200).json(await productosService.obtenerProducto(codigo));
}

export async function crear(req, res) {
  res.status(201).json(await productosService.crearProducto(esquemaProducto.parse(req.body)));
}
export async function modificar(req, res) {
  const { codigo } = esquemaCodigoProducto.parse(req.params);
  res.json(await productosService.actualizarProducto(codigo, esquemaProducto.parse(req.body)));
}
export async function eliminar(req, res) {
  await productosService.eliminarProducto(esquemaCodigoProducto.parse(req.params).codigo);
  res.status(204).end();
}
