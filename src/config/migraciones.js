import fs from 'node:fs';
import path from 'node:path';

const CARPETA = path.resolve(import.meta.dirname, '../../migrations');
const MARCA_SUBIDA = '-- Up Migration';
const MARCA_BAJADA = '-- Down Migration';

// Cada archivo migrations/<marca>_<nombre>.sql tiene una sección de subida y otra de bajada.
function leerMigraciones() {
  return fs.readdirSync(CARPETA).filter((archivo) => archivo.endsWith('.sql')).sort().map((archivo) => {
    const texto = fs.readFileSync(path.join(CARPETA, archivo), 'utf8');
    const inicioBajada = texto.indexOf(MARCA_BAJADA);
    if (!texto.startsWith(MARCA_SUBIDA) || inicioBajada === -1) {
      throw new Error(`${archivo} debe comenzar con "${MARCA_SUBIDA}" e incluir "${MARCA_BAJADA}".`);
    }
    return { nombre: archivo, subida: texto.slice(MARCA_SUBIDA.length, inicioBajada), bajada: texto.slice(inicioBajada + MARCA_BAJADA.length) };
  });
}

// Aplica en orden las migraciones pendientes. Cada una corre en su propia transacción:
// si falla, la base queda como estaba y no se registra como aplicada.
export async function migrarHaciaArriba(cliente) {
  await cliente.query(`CREATE TABLE IF NOT EXISTS migracion_aplicada (
    nombre text PRIMARY KEY, aplicada_en timestamptz NOT NULL DEFAULT now())`);
  const { rows } = await cliente.query('SELECT nombre FROM migracion_aplicada');
  const aplicadas = new Set(rows.map((fila) => fila.nombre));
  const nuevas = [];
  for (const migracion of leerMigraciones().filter((m) => !aplicadas.has(m.nombre))) {
    await cliente.query('BEGIN');
    try {
      await cliente.query(migracion.subida);
      await cliente.query('INSERT INTO migracion_aplicada (nombre) VALUES ($1)', [migracion.nombre]);
      await cliente.query('COMMIT');
      nuevas.push(migracion.nombre);
    } catch (error) {
      await cliente.query('ROLLBACK');
      throw new Error(`Falló la migración ${migracion.nombre}: ${error.message}`);
    }
  }
  return nuevas;
}

// Revierte solo la última migración aplicada.
export async function revertirUltima(cliente) {
  const { rows } = await cliente.query('SELECT nombre FROM migracion_aplicada ORDER BY nombre DESC LIMIT 1');
  if (rows.length === 0) return null;
  const migracion = leerMigraciones().find((m) => m.nombre === rows[0].nombre);
  await cliente.query('BEGIN');
  try {
    await cliente.query(migracion.bajada);
    await cliente.query('DELETE FROM migracion_aplicada WHERE nombre = $1', [migracion.nombre]);
    await cliente.query('COMMIT');
    return migracion.nombre;
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  }
}
