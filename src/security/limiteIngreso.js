import { ipKeyGenerator, rateLimit } from 'express-rate-limit';

const VENTANA_MS = 15 * 60 * 1000;

const responderLimite = (req, res) => res.status(429).json({
  error: { codigo: 'DEMASIADOS_INTENTOS', mensaje: 'Demasiados intentos de ingreso. Espera unos minutos y vuelve a intentarlo.' },
});

// Dos límites a la vez: por IP (un atacante desde un equipo) y por cuenta (el mismo correo
// atacado desde muchas IP). Solo cuentan los intentos fallidos.
const opciones = {
  windowMs: VENTANA_MS,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: responderLimite,
};

export function crearLimitesIngreso() {
  return {
    limitePorIp: rateLimit({ ...opciones, limit: 20 }),
    limitePorCuenta: rateLimit({
      ...opciones,
      limit: 5,
      keyGenerator: (req) => {
        const correo = typeof req.body?.correo === 'string' ? req.body.correo.trim().toLowerCase() : '';
        return correo ? `cuenta:${correo}` : `ip:${ipKeyGenerator(req.ip)}`;
      },
    }),
  };
}

export const { limitePorIp, limitePorCuenta } = crearLimitesIngreso();
