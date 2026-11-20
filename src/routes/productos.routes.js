import { Router } from 'express';
import * as productosController from '../controllers/productos.controller.js';
import { autenticar } from '../security/autenticar.js';
import { autorizar } from '../security/autorizar.js';

// Catálogo público (RF02 y RF03). La escritura de administración se agrega en la semana 2.
export const productosRoutes = Router();

productosRoutes.get('/', productosController.listar);
productosRoutes.get('/:codigo', productosController.detalle);
productosRoutes.use(autenticar, autorizar('administracion'));
productosRoutes.post('/', productosController.crear);
productosRoutes.put('/:codigo', productosController.modificar);
productosRoutes.delete('/:codigo', productosController.eliminar);
