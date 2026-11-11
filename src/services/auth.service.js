import { enTransaccion } from '../config/baseDatos.js';
import { entorno } from '../config/entorno.js';
import { ErrorApi } from '../errores/ErrorApi.js';
import * as usuariosRepository from '../repositories/usuarios.repository.js';
import { usuarioPublico } from '../schemas/auth.schemas.js';
import { hashearContrasena, verificarContrasena, verificarSinCuenta } from '../security/contrasenas.js';
import { emitirToken } from '../security/tokens.js';

const credencialesInvalidas = () => new ErrorApi(401, 'CREDENCIALES_INVALIDAS', 'Correo o contraseña incorrectos.');

// Registro público: siempre crea un cliente. El rol lo decide el servidor (regla 9 del ERS).
export async function registrarCliente(datos) {
  const hash = await hashearContrasena(datos.contrasena);
  try {
    const usuario = await enTransaccion((cliente) => usuariosRepository.crearCliente(cliente, datos, hash));
    return usuarioPublico(usuario);
  } catch (error) {
    if (error.code === '23505') {
      // Unicidad en la base: correo o RUN ya registrados (incluye correos del personal).
      throw new ErrorApi(409, 'CUENTA_EXISTENTE', 'Ya existe una cuenta con ese correo o RUN.');
    }
    if (error.code === '23503') {
      throw new ErrorApi(400, 'VALIDACION', 'Revisa los datos enviados.', { zonaId: 'La zona de despacho no existe.' });
    }
    throw error;
  }
}

// Mismo mensaje y mismo tiempo de respuesta si el correo no existe, la contraseña falla
// o la cuenta está deshabilitada: la respuesta no revela qué cuentas existen.
export async function iniciarSesion({ correo, contrasena }) {
  const usuario = await usuariosRepository.buscarCredencialesPorCorreo(correo);
  const valida = usuario
    ? await verificarContrasena(usuario.hashContrasena, contrasena)
    : await verificarSinCuenta(contrasena);
  if (!valida || usuario.estado !== 'activo') throw credencialesInvalidas();

  return {
    accessToken: await emitirToken(usuario),
    tokenType: 'Bearer',
    expiresIn: entorno.JWT_DURACION_SEGUNDOS,
  };
}

// La identidad sale del token ya validado (req.usuario), nunca de un id enviado por el cliente.
export async function obtenerPerfil(usuario) {
  const perfil = usuario.rol === 'cliente' ? await usuariosRepository.buscarPerfilCliente(usuario.id) : undefined;
  return usuarioPublico({ ...usuario, perfil });
}

export async function cerrarSesion(usuario) {
  await usuariosRepository.incrementarVersionSesion(usuario.id);
}
