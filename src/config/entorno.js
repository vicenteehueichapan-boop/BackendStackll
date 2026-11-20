import { z } from 'zod';

// Toda la configuración llega por variables de entorno y se valida al arrancar:
// si falta un secreto, el servidor no inicia en vez de fallar a mitad de una solicitud.
const esquema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PUERTO: z.coerce.number().int().min(1).max(65535).default(3000),
  DIRECCION_ESCUCHA: z.enum(['127.0.0.1', '0.0.0.0']).default('127.0.0.1'),
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().min(1).max(65535).default(5432),
  DB_NAME: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_TLS: z.enum(['verify', 'local']).default('verify'),
  DB_CA_PATH: z.string().optional(),
  JWT_SECRETO: z.string()
    .refine((valor) => Buffer.from(valor, 'base64').length >= 32, 'debe ser una clave base64 de al menos 32 bytes'),
  JWT_EMISOR: z.string().min(1).default('gas-el-volcan-api'),
  JWT_AUDIENCIA: z.string().min(1).default('gas-el-volcan-web'),
  JWT_DURACION_SEGUNDOS: z.coerce.number().int().min(60).max(3600).default(900),
  ORIGENES_PERMITIDOS: z.string().min(1)
    .transform((valor) => valor.split(',').map((origen) => origen.trim()).filter(Boolean)),
}).superRefine((datos, contexto) => {
  if (datos.DB_TLS === 'verify' && !datos.DB_CA_PATH) contexto.addIssue({ code: 'custom', path: ['DB_CA_PATH'], message: 'falta el certificado de la base de datos' });
  if (datos.DB_TLS === 'local' && !['localhost', '127.0.0.1', '::1'].includes(datos.DB_HOST)) {
    contexto.addIssue({ code: 'custom', path: ['DB_TLS'], message: 'el modo local solo admite loopback' });
  }
});

const resultado = esquema.safeParse(process.env);
if (!resultado.success) {
  // Solo se informan los nombres de las variables, nunca sus valores.
  const variables = resultado.error.issues.map((problema) => `${problema.path.join('.')}: ${problema.message}`);
  throw new Error(`Configuración inválida. Revisa el archivo .env:\n- ${variables.join('\n- ')}`);
}

export const entorno = Object.freeze(resultado.data);
