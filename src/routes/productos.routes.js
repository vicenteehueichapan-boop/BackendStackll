import { Router } from 'express';
import * as productosController from '../controllers/productos.controller.js';

// Catálogo público (RF02 y RF03). La escritura de administración se agrega en la semana 2.
export const productosRoutes = Router();

productosRoutes.get('/', productosController.listar);
productosRoutes.get('/:codigo', productosController.detalle);
