import { Router } from 'express';
import * as controlador from '../controllers/usuarios.controller.js';
import { autenticar } from '../security/autenticar.js';
import { autorizar } from '../security/autorizar.js';

export const usuariosRoutes = Router();
usuariosRoutes.use(autenticar);
usuariosRoutes.get('/:id', controlador.obtener);
usuariosRoutes.use(autorizar('administracion'));
usuariosRoutes.get('/', controlador.listar);
usuariosRoutes.post('/', controlador.crear);
usuariosRoutes.patch('/:id', controlador.modificar);
usuariosRoutes.delete('/:id', controlador.desactivar);
