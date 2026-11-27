import { consultar } from '../config/baseDatos.js';

const columnas = 'id, correo, nombre, apellidos, rol';

export async function listar() {
  const { rows } = await consultar(`SELECT ${columnas} FROM kaiju_usuario ORDER BY nombre, apellidos, id`);
  return rows;
}

export async function buscarPorId(id) {
  const { rows } = await consultar(`SELECT ${columnas}, version_sesion AS "versionSesion",
    'activo' AS estado FROM kaiju_usuario WHERE id=$1`, [id]);
  return rows[0];
}

export async function buscarCredenciales(correo) {
  const { rows } = await consultar(`SELECT ${columnas}, version_sesion AS "versionSesion",
    hash_contrasena AS "hashContrasena" FROM kaiju_usuario WHERE correo=$1`, [correo]);
  return rows[0];
}

export async function crear(db, datos, hash) {
  const { rows } = await db.query(`INSERT INTO kaiju_usuario (correo, nombre, apellidos, rol, hash_contrasena)
    VALUES ($1, $2, $3, $4, $5) RETURNING ${columnas}`,
  [datos.correo, datos.nombre, datos.apellidos, datos.rol, hash]);
  return rows[0];
}

export async function bloquear(db, id) {
  const { rows } = await db.query(`SELECT ${columnas} FROM kaiju_usuario WHERE id=$1 FOR UPDATE`, [id]);
  return rows[0];
}

export async function modificar(db, id, datos, hash) {
  const { rows } = await db.query(`UPDATE kaiju_usuario
    SET correo=$2, nombre=$3, apellidos=$4, rol=$5,
      hash_contrasena=COALESCE($6, hash_contrasena),
      version_sesion=version_sesion + CASE WHEN rol<>$5 OR $6 IS NOT NULL THEN 1 ELSE 0 END
    WHERE id=$1 RETURNING ${columnas}`, [id, datos.correo, datos.nombre, datos.apellidos, datos.rol, hash]);
  return rows[0];
}

export async function eliminar(db, id) {
  await db.query('DELETE FROM kaiju_usuario WHERE id=$1', [id]);
}

export async function cerrarSesion(usuario) {
  await consultar(`UPDATE kaiju_usuario SET version_sesion=version_sesion+1
    WHERE id=$1 AND version_sesion=$2`, [usuario.id, usuario.versionSesion]);
}
