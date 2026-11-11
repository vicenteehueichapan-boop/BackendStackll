import { loadEnv } from 'vite';

// Antes de todas las pruebas: aplica las migraciones en la base de pruebas, la deja vacía
// y carga el catálogo inicial. Así cada ejecución parte del mismo estado conocido.
export async function setup() {
  Object.assign(process.env, loadEnv('test', process.cwd(), ''));
  if (!process.env.DB_NAME?.endsWith('_test')) {
    throw new Error('Las pruebas solo corren contra una base cuyo nombre termina en _test.');
  }
  const { pool } = await import('../src/config/baseDatos.js');
  const { migrarHaciaArriba } = await import('../src/config/migraciones.js');
  const { sembrarCatalogo } = await import('../seeds/sembrar.js');

  const cliente = await pool.connect();
  try {
    await migrarHaciaArriba(cliente);
    await cliente.query(`TRUNCATE linea_pedido, pedido, perfil_cliente, usuario, producto, categoria,
                         zona_despacho, mensaje_contacto RESTART IDENTITY CASCADE`);
    await sembrarCatalogo(cliente);
  } finally {
    cliente.release();
    await pool.end();
  }
}
