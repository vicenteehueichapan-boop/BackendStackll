import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { autenticar } from '../security/autenticar.js';
import { limitePorCuenta, limitePorIp } from '../security/limiteIngreso.js';

export const authRoutes = Router();

authRoutes.post('/register', limitePorIp, authController.registrar);
authRoutes.post('/login', limitePorIp, limitePorCuenta, authController.ingresar);
authRoutes.get('/me', autenticar, authController.perfil);
authRoutes.post('/logout', autenticar, authController.cerrarSesion);
