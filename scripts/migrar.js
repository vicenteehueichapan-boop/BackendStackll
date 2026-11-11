// Aplica las migraciones pendientes de migrations/ con la misma conexión TLS de la API.
// Uso: npm run migrar           (aplica las pendientes)
//      npm run migrar -- down   (revierte la última)
import { pool } from '../src/config/baseDatos.js';
import { migrarHaciaArriba, revertirUltima } from '../src/config/migraciones.js';

const cliente = await pool.connect();
try {
  if (process.argv[2] === 'down') {
    const revertida = await revertirUltima(cliente);
    console.log(revertida ? `Revertida: ${revertida}` : 'No hay migraciones aplicadas.');
  } else {
    const nuevas = await migrarHaciaArriba(cliente);
    console.log(nuevas.length ? `Aplicadas: ${nuevas.join(', ')}` : 'La base ya está al día.');
  }
} finally {
  cliente.release();
  await pool.end();
}
