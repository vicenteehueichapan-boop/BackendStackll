import { z } from 'zod';
import { esquemaRegistro } from './auth.schemas.js';

export const esquemaId = z.object({ id: z.uuid() });
export const roles = ['cliente', 'operadora', 'repartidor', 'administracion'];
export const esquemaCrearPersonal = esquemaRegistro.pick({ nombre: true, apellidos: true, correo: true, contrasena: true })
  .extend({ rol: z.enum(['operadora', 'repartidor', 'administracion']) }).strict();
export const esquemaModificarUsuario = esquemaRegistro.pick({ nombre: true, apellidos: true, correo: true })
  .extend({ rol: z.enum(roles), estado: z.enum(['activo', 'deshabilitado']) }).partial().strict()
  .refine((datos) => Object.keys(datos).length > 0, 'Envía al menos un campo.');
