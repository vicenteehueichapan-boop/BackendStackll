import { z } from 'zod';
import { esquemaRegistro } from './auth.schemas.js';

export const rolesKaiju = ['administrador', 'vendedor', 'encargado_inventario'];
export const crearUsuarioKaiju = esquemaRegistro
  .pick({ nombre: true, apellidos: true, correo: true, contrasena: true })
  .extend({ rol: z.enum(rolesKaiju, 'Selecciona un perfil de Kaiju.') }).strict();

export const editarUsuarioKaiju = crearUsuarioKaiju.partial()
  .refine((datos) => Object.keys(datos).length > 0, 'Envía al menos un campo.');
