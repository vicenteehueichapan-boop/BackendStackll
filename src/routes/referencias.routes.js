import { Router } from 'express';
import { consultar } from '../config/baseDatos.js';
import { autenticar } from '../security/autenticar.js';
import { autorizar } from '../security/autorizar.js';
import { repartidores } from '../controllers/pedidos.controller.js';

export const referenciasRoutes = Router();
referenciasRoutes.get('/categorias', async (req, res) => {
  res.json((await consultar('SELECT id,nombre FROM categoria ORDER BY nombre')).rows);
});
referenciasRoutes.get('/zonas', async (req, res) => {
  res.json((await consultar('SELECT id,nombre,comunas,dias,horario,tiempo_estimado AS "tiempoEstimado" FROM zona_despacho ORDER BY id')).rows);
});
referenciasRoutes.get('/repartidores', autenticar, autorizar('operadora', 'administracion'), repartidores);
