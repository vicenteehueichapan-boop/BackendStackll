import { crearApp } from './app.js';
import { pool } from './config/baseDatos.js';
import { entorno } from './config/entorno.js';
import { registro } from './config/registro.js';

const servidor = crearApp().listen(entorno.PUERTO, '0.0.0.0', () => {
  registro.info(`API Gas El Volcán escuchando en el puerto ${entorno.PUERTO}`);
});

// systemd envía SIGTERM al detener o reiniciar: se terminan las solicitudes en curso y se cierra la base.
process.on('SIGTERM', () => {
  servidor.close(async () => {
    await pool.end();
    process.exit(0);
  });
});
