import { esquemaCrearPersonal, esquemaId, esquemaModificarUsuario } from '../schemas/usuarios.schemas.js';
import * as servicio from '../services/usuarios.service.js';

export async function listar(req, res) { res.json(await servicio.listarUsuarios()); }
export async function crear(req, res) { res.status(201).json(await servicio.crearPersonal(esquemaCrearPersonal.parse(req.body))); }
export async function obtener(req, res) { res.json(await servicio.obtenerUsuario(esquemaId.parse(req.params).id, req.usuario)); }
export async function modificar(req, res) {
  res.json(await servicio.modificarUsuario(esquemaId.parse(req.params).id, esquemaModificarUsuario.parse(req.body)));
}
export async function desactivar(req, res) {
  await servicio.modificarUsuario(esquemaId.parse(req.params).id, { estado: 'deshabilitado' });
  res.status(204).end();
}
