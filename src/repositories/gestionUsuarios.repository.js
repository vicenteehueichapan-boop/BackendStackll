import { consultar } from '../config/baseDatos.js';

export const columnasUsuario = `id, correo, nombre, apellidos, rol, estado`;

export async function listar() {
  const { rows } = await consultar(`SELECT ${columnasUsuario} FROM usuario ORDER BY nombre, id`);
  return rows;
}

export async function crear(db, datos, hash) {
  const { rows } = await db.query(`INSERT INTO usuario (correo, nombre, apellidos, hash_contrasena, rol)
    VALUES ($1,$2,$3,$4,$5) RETURNING ${columnasUsuario}`,
  [datos.correo, datos.nombre, datos.apellidos, hash, datos.rol]);
  return rows[0];
}

export async function bloquear(db, id) {
  const { rows } = await db.query(`SELECT ${columnasUsuario} FROM usuario WHERE id=$1 FOR UPDATE`, [id]);
  return rows[0];
}

export async function modificar(db, id, datos) {
  const { rows } = await db.query(`UPDATE usuario SET nombre=$2, apellidos=$3, correo=$4, rol=$5, estado=$6,
    version_sesion=version_sesion+1, actualizado_en=now() WHERE id=$1 RETURNING ${columnasUsuario}`,
  [id, datos.nombre, datos.apellidos, datos.correo, datos.rol, datos.estado]);
  return rows[0];
}
