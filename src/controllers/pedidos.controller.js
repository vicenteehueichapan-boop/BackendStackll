import { esquemaId } from '../schemas/usuarios.schemas.js';
import { esquemaAsignacion, esquemaEstado, esquemaPedido } from '../schemas/pedidos.schemas.js';
import * as servicio from '../services/pedidos.service.js';

export async function listar(req, res) { res.json(await servicio.listarPedidos(req.usuario)); }
export async function crear(req, res) { res.status(201).json(await servicio.crearPedido(esquemaPedido.parse(req.body), req.usuario)); }
export async function obtener(req, res) { res.json(await servicio.obtenerPedido(esquemaId.parse(req.params).id, req.usuario)); }
export async function asignar(req, res) {
  res.json(await servicio.asignarRepartidor(esquemaId.parse(req.params).id, esquemaAsignacion.parse(req.body).repartidorId, req.usuario));
}
export async function cambiarEstado(req, res) {
  res.json(await servicio.cambiarEstado(esquemaId.parse(req.params).id, esquemaEstado.parse(req.body).estado, req.usuario));
}
export async function eliminar(req, res) {
  await servicio.eliminarPedido(esquemaId.parse(req.params).id, req.usuario);
  res.status(204).end();
}
export async function repartidores(req, res) { res.json(await servicio.listarRepartidores()); }
