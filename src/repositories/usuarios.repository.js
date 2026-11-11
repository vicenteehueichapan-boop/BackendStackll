import { consultar } from '../config/baseDatos.js';

const COLUMNAS = `u.id, u.correo, u.nombre, u.apellidos, u.rol, u.estado, u.version_sesion AS "versionSesion"`;

export async function buscarPorId(id) {
  const { rows } = await consultar(`SELECT ${COLUMNAS} FROM usuario u WHERE u.id = $1`, [id]);
  return rows[0];
}

// Única consulta que devuelve el hash: la usa el login para verificar la contraseña.
export async function buscarCredencialesPorCorreo(correo) {
  const { rows } = await consultar(
    `SELECT ${COLUMNAS}, u.hash_contrasena AS "hashContrasena" FROM usuario u WHERE u.correo = $1`,
    [correo],
  );
  return rows[0];
}

export async function buscarPerfilCliente(usuarioId) {
  const { rows } = await consultar(
    `SELECT run, tipo_cliente AS "tipoCliente", direccion, zona_id AS "zonaId"
       FROM perfil_cliente WHERE usuario_id = $1`,
    [usuarioId],
  );
  return rows[0];
}

// Se ejecuta dentro de una transacción (cliente recibido): usuario y perfil se guardan juntos.
export async function crearCliente(cliente, datos, hashContrasena) {
  const { rows } = await cliente.query(
    `INSERT INTO usuario (correo, nombre, apellidos, hash_contrasena, rol)
     VALUES ($1, $2, $3, $4, 'cliente')
     RETURNING id, correo, nombre, apellidos, rol, estado, version_sesion AS "versionSesion"`,
    [datos.correo, datos.nombre, datos.apellidos, hashContrasena],
  );
  await cliente.query(
    `INSERT INTO perfil_cliente (usuario_id, run, tipo_cliente, direccion, zona_id)
     VALUES ($1, $2, $3, $4, $5)`,
    [rows[0].id, datos.run, datos.tipoCliente, datos.direccion, datos.zonaId],
  );
  return rows[0];
}

// Cerrar sesión: al cambiar la versión, todo token emitido antes deja de ser aceptado.
export async function incrementarVersionSesion(usuarioId) {
  await consultar(
    'UPDATE usuario SET version_sesion = version_sesion + 1, actualizado_en = now() WHERE id = $1',
    [usuarioId],
  );
}
