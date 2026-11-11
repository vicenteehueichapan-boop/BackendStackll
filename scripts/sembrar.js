// Carga los datos iniciales de prueba. Se puede ejecutar varias veces: no duplica registros
// y no pisa cambios hechos después (ON CONFLICT DO NOTHING).
// Uso: npm run sembrar
import { pool } from '../src/config/baseDatos.js';
import { sembrarCatalogo, sembrarPersonalDemo } from '../seeds/sembrar.js';

const contrasenaDemo = process.env.SEMILLA_CONTRASENA_DEMO ?? '';
if (contrasenaDemo.length < 8) {
  throw new Error('Define SEMILLA_CONTRASENA_DEMO (ficticia, 8 o más caracteres) en .env antes de sembrar.');
}

try {
  const catalogo = await sembrarCatalogo(pool);
  const personal = await sembrarPersonalDemo(pool, contrasenaDemo);
  console.log(`Semillas: ${catalogo.zonas} zonas, ${catalogo.categorias} categorías, ${catalogo.productos} productos, ${personal} perfiles nuevos del personal.`);
} finally {
  await pool.end();
}
