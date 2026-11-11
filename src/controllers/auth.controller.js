import { esquemaIngreso, esquemaRegistro } from '../schemas/auth.schemas.js';
import * as authService from '../services/auth.service.js';

// Los controladores solo traducen HTTP: validan la entrada, llaman al servicio y fijan el estado.

export async function registrar(req, res) {
  const datos = esquemaRegistro.parse(req.body);
  res.status(201).json(await authService.registrarCliente(datos));
}

export async function ingresar(req, res) {
  const credenciales = esquemaIngreso.parse(req.body);
  res.status(200).json(await authService.iniciarSesion(credenciales));
}

export async function perfil(req, res) {
  res.status(200).json(await authService.obtenerPerfil(req.usuario));
}

export async function cerrarSesion(req, res) {
  await authService.cerrarSesion(req.usuario);
  res.status(204).end();
}
