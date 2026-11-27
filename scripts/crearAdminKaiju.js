import { pool } from '../src/config/baseDatos.js';
import { registro } from '../src/config/registro.js';
import { crearUsuarioKaiju } from '../src/schemas/kaiju.schemas.js';
import { crear } from '../src/services/kaijuUsuarios.service.js';

try {
  const datos = crearUsuarioKaiju.safeParse({
    rol: 'administrador',
    correo: process.env.KAIJU_ADMIN_CORREO,
    nombre: process.env.KAIJU_ADMIN_NOMBRE,
    apellidos: process.env.KAIJU_ADMIN_APELLIDOS,
    contrasena: process.env.KAIJU_ADMIN_CONTRASENA,
  });
  if (!datos.success) throw new Error('Completa las variables KAIJU_ADMIN_* con datos válidos (contraseña de 8 a 128 caracteres).');
  const usuario = await crear(datos.data);
  registro.info({ id: usuario.id }, 'administrador Kaiju creado');
} catch (error) {
  registro.error({ mensaje: error.code ? 'No se pudo guardar el administrador.' : error.message }, 'alta de administrador Kaiju');
  process.exitCode = 1;
} finally {
  await pool.end();
}
