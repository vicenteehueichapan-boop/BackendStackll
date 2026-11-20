import { Router } from 'express';
import * as controlador from '../controllers/pedidos.controller.js';
import { autenticar } from '../security/autenticar.js';
import { autorizar } from '../security/autorizar.js';

export const pedidosRoutes = Router();
pedidosRoutes.use(autenticar);
pedidosRoutes.get('/', controlador.listar);
pedidosRoutes.post('/', autorizar('cliente'), controlador.crear);
pedidosRoutes.get('/:id', controlador.obtener);
pedidosRoutes.patch('/:id/asignacion', autorizar('operadora', 'administracion'), controlador.asignar);
pedidosRoutes.patch('/:id/estado', autorizar('repartidor', 'operadora', 'administracion'), controlador.cambiarEstado);
pedidosRoutes.delete('/:id', autorizar('cliente', 'operadora', 'administracion'), controlador.eliminar);
