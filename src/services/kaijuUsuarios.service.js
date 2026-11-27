import { enTransaccion } from '../config/baseDatos.js';
import { entorno } from '../config/entorno.js';
import { ErrorApi } from '../errores/ErrorApi.js';
import * as repositorio from '../repositories/kaijuUsuarios.repository.js';
import { usuarioPublico } from '../schemas/auth.schemas.js';
import { hashearContrasena, verificarContrasena, verificarSinCuenta } from '../security/contrasenas.js';
import { emitirToken } from '../security/tokens.js';

export const audienciaKaiju = `${entorno.JWT_AUDIENCIA}:kaiju`;
export const listar = repositorio.listar;
export const cerrarSesion = repositorio.cerrarSesion;

export async function ingresar({ correo, contrasena }) {
  const usuario = await repositorio.buscarCredenciales(correo);
  const valida = usuario
    ? await verificarContrasena(usuario.hashContrasena, contrasena)
    : await verificarSinCuenta(contrasena);
  if (!valida) throw new ErrorApi(401, 'CREDENCIALES_INVALIDAS', 'Correo o contraseña incorrectos.');

  return {
    accessToken: await emitirToken(usuario, audienciaKaiju),
    expiresIn: entorno.JWT_DURACION_SEGUNDOS,
    usuario: usuarioPublico(usuario),
  };
}

function errorCorreoDuplicado(error) {
  if (error.code === '23505' && error.constraint === 'kaiju_usuario_correo_key') {
    return new ErrorApi(409, 'CORREO_EXISTENTE', 'Ese correo ya está registrado en Kaiju.',
      { correo: 'Ese correo ya está registrado en Kaiju.' });
  }
  return error;
}

export async function crear(datos, actor) {
  const hash = await hashearContrasena(datos.contrasena);
  try {
    const guardar = (db) => repositorio.crear(db, datos, hash);
    return await (actor ? gestionar(actor, guardar) : enTransaccion(guardar));
  } catch (error) {
    throw errorCorreoDuplicado(error);
  }
}

// Solo un administrador puede mutar usuarios. Se vuelve a comprobar dentro de la
// transacción para que una baja, un cambio de rol o un cierre de sesión concurrente rija al guardar.
function gestionar(actor, operacion) {
  return enTransaccion(async (db) => {
    await db.query('SELECT pg_advisory_xact_lock(1105, 3)');
    const { rows: [autorizado] } = await db.query(
      'SELECT rol, version_sesion FROM kaiju_usuario WHERE id=$1 FOR UPDATE', [actor.id],
    );
    if (autorizado?.rol !== 'administrador' || autorizado.version_sesion !== actor.versionSesion) {
      throw new ErrorApi(401, 'SESION_INVALIDA', 'Vuelve a iniciar sesión.');
    }
    return operacion(db);
  });
}

async function buscarParaCambiar(db, id) {
  const usuario = await repositorio.bloquear(db, id);
  if (!usuario) throw new ErrorApi(404, 'USUARIO_NO_ENCONTRADO', 'El usuario no existe.');
  return usuario;
}

export async function modificar(actor, id, cambios) {
  if (actor.id === id && cambios.rol && cambios.rol !== actor.rol) {
    throw new ErrorApi(409, 'PROPIO_PERFIL', 'Otro administrador debe cambiar tu perfil.');
  }
  const hash = cambios.contrasena === undefined ? null : await hashearContrasena(cambios.contrasena);
  try {
    return await gestionar(actor, async (db) => {
      const actual = await buscarParaCambiar(db, id);
      return repositorio.modificar(db, id, { ...actual, ...cambios }, hash);
    });
  } catch (error) {
    throw errorCorreoDuplicado(error);
  }
}

export async function eliminar(actor, id) {
  if (actor.id === id) {
    throw new ErrorApi(409, 'PROPIA_CUENTA', 'Otro administrador debe eliminar tu cuenta.');
  }
  await gestionar(actor, async (db) => {
    await buscarParaCambiar(db, id);
    await repositorio.eliminar(db, id);
  });
}
