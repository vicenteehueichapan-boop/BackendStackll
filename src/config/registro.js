import pino from 'pino';

// Logs en JSON. Las rutas de redact borran contraseñas, tokens y cabeceras de sesión
// antes de escribir: nunca deben quedar en un registro.
export const registro = pino({
  level: process.env.NODE_ENV === 'test' ? 'silent' : 'info',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      '*.contrasena',
      '*.accessToken',
      '*.hashContrasena',
    ],
    censor: '[oculto]',
  },
});
