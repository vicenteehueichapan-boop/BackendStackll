import fs from 'node:fs';
import pg from 'pg';
import { entorno } from './entorno.js';
import { registro } from './registro.js';

// PostgreSQL devuelve bigint (count) como texto; los conteos de esta API caben en un número.
pg.types.setTypeParser(pg.types.builtins.INT8, (valor) => Number(valor));

export const pool = new pg.Pool({
  host: entorno.DB_HOST,
  port: entorno.DB_PORT,
  database: entorno.DB_NAME,
  user: entorno.DB_USER,
  password: entorno.DB_PASSWORD,
  // TLS verificado con el certificado de AWS: el tráfico hacia RDS va cifrado.
  ssl: { ca: fs.readFileSync(entorno.DB_CA_PATH, 'utf8') },
  max: 10,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
});

// Un cliente inactivo que pierde la conexión no debe detener el servidor.
pool.on('error', (error) => registro.error({ codigo: error.code, err: error }, 'error en una conexión inactiva'));

export function consultar(texto, valores = []) {
  return pool.query(texto, valores);
}

// Ejecuta varias operaciones como una sola unidad: o se guardan todas o ninguna.
export async function enTransaccion(trabajo) {
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    const resultado = await trabajo(cliente);
    await cliente.query('COMMIT');
    return resultado;
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
}
