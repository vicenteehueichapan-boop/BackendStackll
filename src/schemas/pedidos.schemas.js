import { z } from 'zod';
import { esquemaRegistro } from './auth.schemas.js';
import { esquemaCodigoProducto } from './productos.schemas.js';

export const esquemaPedido = esquemaRegistro.pick({ nombre: true, apellidos: true, correo: true, tipoCliente: true })
  .extend({
    direccion: z.string().trim().min(5).max(200),
    zonaId: z.string().trim().regex(/^[a-z]+$/),
    lineas: z.array(z.object({
      codigo: esquemaCodigoProducto.shape.codigo,
      cantidad: z.number().int().min(1).max(10000),
      precioEsperado: z.number().int().min(1).max(2147483647),
    }).strict()).min(1).max(100)
      .refine((lineas) => new Set(lineas.map((linea) => linea.codigo)).size === lineas.length, 'No repitas productos.'),
  }).strict();
export const esquemaAsignacion = z.object({ repartidorId: z.uuid() }).strict();
export const esquemaEstado = z.object({ estado: z.enum(['en_camino', 'entregado']) }).strict();
