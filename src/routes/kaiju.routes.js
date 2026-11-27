import { Router } from 'express';
import { buscarPorId } from '../repositories/kaijuUsuarios.repository.js';
import { esquemaIngreso } from '../schemas/auth.schemas.js';
import { crearUsuarioKaiju, editarUsuarioKaiju } from '../schemas/kaiju.schemas.js';
import { esquemaId } from '../schemas/usuarios.schemas.js';
import { crearAutenticador } from '../security/autenticar.js';
import { autorizar } from '../security/autorizar.js';
import { crearLimitesIngreso } from '../security/limiteIngreso.js';
import * as usuarios from '../services/kaijuUsuarios.service.js';

export const kaijuRoutes = Router();
const autenticar = crearAutenticador(buscarPorId, usuarios.audienciaKaiju);
const { limitePorIp, limitePorCuenta } = crearLimitesIngreso();

kaijuRoutes.post('/auth/login', limitePorIp, limitePorCuenta, async (req, res) => {
  res.json(await usuarios.ingresar(esquemaIngreso.parse(req.body)));
});

kaijuRoutes.post('/auth/logout', autenticar, async (req, res) => {
  await usuarios.cerrarSesion(req.usuario);
  res.status(204).end();
});

kaijuRoutes.use('/usuarios', autenticar, autorizar('administrador'));

kaijuRoutes.get('/usuarios', async (_req, res) => {
  res.json(await usuarios.listar());
});

kaijuRoutes.post('/usuarios', async (req, res) => {
  res.status(201).json(await usuarios.crear(crearUsuarioKaiju.parse(req.body), req.usuario));
});

kaijuRoutes.patch('/usuarios/:id', async (req, res) => {
  const { id } = esquemaId.parse(req.params);
  res.json(await usuarios.modificar(req.usuario, id, editarUsuarioKaiju.parse(req.body)));
});

kaijuRoutes.delete('/usuarios/:id', async (req, res) => {
  const { id } = esquemaId.parse(req.params);
  await usuarios.eliminar(req.usuario, id);
  res.status(204).end();
});
