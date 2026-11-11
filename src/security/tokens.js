import { randomUUID } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { entorno } from '../config/entorno.js';

// La API emite y verifica sus propios tokens: basta una clave simétrica (HS256)
// guardada en el .env del servidor, nunca en React ni en el repositorio.
const ALGORITMO = 'HS256';
const clave = Buffer.from(entorno.JWT_SECRETO, 'base64');

// El token solo identifica (sub) y fija su versión de sesión (ver). El rol NO viaja en él:
// se lee de la base en cada solicitud, así un cambio de rol o una cuenta deshabilitada rige al instante.
export function emitirToken(usuario) {
  return new SignJWT({ ver: usuario.versionSesion })
    .setProtectedHeader({ alg: ALGORITMO, typ: 'JWT' })
    .setSubject(usuario.id)
    .setIssuer(entorno.JWT_EMISOR)
    .setAudience(entorno.JWT_AUDIENCIA)
    .setIssuedAt()
    .setExpirationTime(`${entorno.JWT_DURACION_SEGUNDOS}s`)
    .setJti(randomUUID())
    .sign(clave);
}

// Comprueba firma, algoritmo permitido, emisor, destinatario y vencimiento.
// Decodificar sin verificar no basta: un token alterado o vencido lanza error.
export async function verificarToken(token) {
  const { payload } = await jwtVerify(token, clave, {
    algorithms: [ALGORITMO],
    issuer: entorno.JWT_EMISOR,
    audience: entorno.JWT_AUDIENCIA,
    requiredClaims: ['sub', 'iat', 'exp', 'jti', 'ver'],
  });
  return payload;
}
