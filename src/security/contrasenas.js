import argon2 from 'argon2';

// Argon2id con la configuración mínima recomendada por OWASP (19 MiB, 2 iteraciones, 1 hilo).
// Cada hash lleva su propia sal aleatoria y sus parámetros, así que se pueden subir más adelante.
const OPCIONES = { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 };

export function hashearContrasena(contrasena) {
  return argon2.hash(contrasena, OPCIONES);
}

export function verificarContrasena(hash, contrasena) {
  return argon2.verify(hash, contrasena);
}

// Cuando el correo no existe se verifica igual contra un hash de relleno: así la respuesta
// tarda lo mismo y el tiempo no revela qué cuentas existen.
let hashDeRelleno;
export async function verificarSinCuenta(contrasena) {
  hashDeRelleno ??= await hashearContrasena('relleno-para-igualar-tiempos');
  await argon2.verify(hashDeRelleno, contrasena);
  return false;
}
