import { z } from 'zod';

const correo = z.string().trim().toLowerCase().max(254)
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Ingresa un correo válido.');

// Entrada de POST /api/auth/register. No acepta «rol»: el servidor asigna siempre «cliente».
// .strict() rechaza campos extra, así nadie puede colar un rol o un id.
export const esquemaRegistro = z.object({
  nombre: z.string().trim().min(2, 'Ingresa tu nombre.').max(80),
  apellidos: z.string().trim().min(2, 'Ingresa tus apellidos.').max(80),
  run: z.string().trim().toUpperCase().regex(/^[0-9]{7,8}[0-9K]$/, 'Ingresa el RUN sin puntos ni guion.'),
  correo,
  // NIST SP 800-63B: mínimo 8 caracteres; máximo 128 para acotar el costo del hash.
  contrasena: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.').max(128),
  tipoCliente: z.enum(['residencial', 'comercial'], 'El tipo de cliente no es válido.'),
  direccion: z.string().trim().max(200).default(''),
  zonaId: z.string().trim().regex(/^[a-z]+$/, 'La zona de despacho no es válida.').nullable().default(null),
}).strict();

// Entrada de POST /api/auth/login. Sin mínimo de largo: no se da pista sobre la regla de contraseñas.
export const esquemaIngreso = z.object({
  correo,
  contrasena: z.string().min(1, 'Ingresa tu contraseña.').max(128),
}).strict();

// Salida pública de un usuario: nunca incluye el hash ni la versión de sesión.
export function usuarioPublico(usuario) {
  return {
    id: usuario.id,
    correo: usuario.correo,
    nombre: usuario.nombre,
    apellidos: usuario.apellidos,
    rol: usuario.rol,
    ...(usuario.perfil && { perfil: usuario.perfil }),
  };
}
