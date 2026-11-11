import { registro } from '../config/registro.js';
import { ErrorApi } from '../errores/ErrorApi.js';
import * as usuariosRepository from '../repositories/usuarios.repository.js';
import { verificarToken } from './tokens.js';

const sesionInvalida = () => new ErrorApi(401, 'SESION_INVALIDA', 'La sesión no es válida o venció. Inicia sesión nuevamente.');

// Exige «Authorization: Bearer <token>». Verifica el token y vuelve a leer al usuario:
// una cuenta deshabilitada o una sesión cerrada (versión distinta) se rechazan aunque el token no haya vencido.
export async function autenticar(req, res, next) {
  const [tipo, token] = (req.get('authorization') ?? '').split(' ');
  if (tipo !== 'Bearer' || !token) {
    throw new ErrorApi(401, 'NO_AUTENTICADO', 'Debes iniciar sesión para usar esta ruta.');
  }

  let afirmaciones;
  try {
    afirmaciones = await verificarToken(token);
  } catch (error) {
    registro.info({ motivo: error.code }, 'token rechazado');
    throw sesionInvalida();
  }

  const usuario = await usuariosRepository.buscarPorId(afirmaciones.sub);
  if (!usuario || usuario.estado !== 'activo' || usuario.versionSesion !== afirmaciones.ver) {
    registro.info({ usuarioId: afirmaciones.sub }, 'sesión revocada o cuenta no activa');
    throw sesionInvalida();
  }

  req.usuario = usuario;
  next();
}
