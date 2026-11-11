import express from 'express';
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { crearApp } from '../../src/app.js';
import { pool } from '../../src/config/baseDatos.js';
import { manejadorErrores } from '../../src/errores/manejadorErrores.js';
import { autenticar } from '../../src/security/autenticar.js';
import { autorizar } from '../../src/security/autorizar.js';

const app = crearApp();
let contador = 0;

function nuevoCliente(cambios = {}) {
  contador += 1;
  return {
    nombre: 'Ana', apellidos: 'Pérez Soto', run: `1000000${contador}K`.slice(-9),
    correo: `ana${contador}@ejemplo.cl`, contrasena: 'Ficticia2026', tipoCliente: 'residencial',
    direccion: 'Av. Libertad 123', zonaId: 'centro', ...cambios,
  };
}

async function registrarEIngresar(datos = nuevoCliente()) {
  await request(app).post('/api/auth/register').send(datos).expect(201);
  const { body } = await request(app).post('/api/auth/login').send({ correo: datos.correo, contrasena: datos.contrasena }).expect(200);
  return { datos, token: body.accessToken };
}

afterAll(() => pool.end());

describe('POST /api/auth/register', () => {
  it('crea un cliente con rol asignado por el servidor y no devuelve el hash', async () => {
    const datos = nuevoCliente();
    const { body } = await request(app).post('/api/auth/register').send(datos).expect(201);
    expect(body).toMatchObject({ correo: datos.correo, rol: 'cliente' });
    expect(JSON.stringify(body)).not.toMatch(/argon2|contrasena|hash/i);
  });

  it('rechaza registrarse con un rol (no puede crearse administrador)', async () => {
    const { body } = await request(app).post('/api/auth/register').send(nuevoCliente({ rol: 'administracion' })).expect(400);
    expect(body.error.codigo).toBe('VALIDACION');
  });

  it('rechaza datos inválidos con un mensaje por campo', async () => {
    const { body } = await request(app).post('/api/auth/register')
      .send(nuevoCliente({ correo: 'sin-arroba', contrasena: '123', run: '1-9' })).expect(400);
    expect(Object.keys(body.error.detalles)).toEqual(expect.arrayContaining(['correo', 'contrasena', 'run']));
  });

  it('rechaza un correo duplicado y no crea un segundo usuario', async () => {
    const datos = nuevoCliente();
    await request(app).post('/api/auth/register').send(datos).expect(201);
    const { body } = await request(app).post('/api/auth/register').send({ ...datos, run: '99999999K' }).expect(409);
    expect(body.error.codigo).toBe('CUENTA_EXISTENTE');
    const { rows } = await pool.query('SELECT count(*) AS total FROM usuario WHERE correo = $1', [datos.correo]);
    expect(rows[0].total).toBe(1);
  });
});

describe('POST /api/auth/login', () => {
  it('entrega un token Bearer con su vigencia', async () => {
    const datos = nuevoCliente();
    await request(app).post('/api/auth/register').send(datos).expect(201);
    const { body } = await request(app).post('/api/auth/login').send({ correo: datos.correo, contrasena: datos.contrasena }).expect(200);
    expect(body).toMatchObject({ tokenType: 'Bearer', expiresIn: 900 });
    expect(body.accessToken.split('.')).toHaveLength(3);
  });

  it('responde lo mismo con contraseña incorrecta y con un correo que no existe', async () => {
    const datos = nuevoCliente();
    await request(app).post('/api/auth/register').send(datos).expect(201);
    const malaClave = await request(app).post('/api/auth/login').send({ correo: datos.correo, contrasena: 'Otra2026xx' }).expect(401);
    const sinCuenta = await request(app).post('/api/auth/login').send({ correo: 'nadie@ejemplo.cl', contrasena: 'Otra2026xx' }).expect(401);
    expect(malaClave.body).toEqual(sinCuenta.body);
    expect(malaClave.body.error.codigo).toBe('CREDENCIALES_INVALIDAS');
  });

  it('bloquea la cuenta tras 5 intentos fallidos (429)', async () => {
    const datos = nuevoCliente();
    await request(app).post('/api/auth/register').send(datos).expect(201);
    for (let intento = 0; intento < 5; intento += 1) {
      await request(app).post('/api/auth/login').send({ correo: datos.correo, contrasena: 'Equivocada1' }).expect(401);
    }
    const { body } = await request(app).post('/api/auth/login').send({ correo: datos.correo, contrasena: datos.contrasena }).expect(429);
    expect(body.error.codigo).toBe('DEMASIADOS_INTENTOS');
  });
});

describe('rutas protegidas', () => {
  it('GET /api/auth/me sin token responde 401', async () => {
    const { body } = await request(app).get('/api/auth/me').expect(401);
    expect(body.error.codigo).toBe('NO_AUTENTICADO');
  });

  it('GET /api/auth/me con token alterado responde 401', async () => {
    const { token } = await registrarEIngresar();
    await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token.slice(0, -2)}xx`).expect(401);
  });

  it('GET /api/auth/me devuelve el perfil del dueño del token, sin hash', async () => {
    const { datos, token } = await registrarEIngresar();
    const { body } = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`).expect(200);
    expect(body).toMatchObject({ correo: datos.correo, rol: 'cliente', perfil: { tipoCliente: 'residencial', zonaId: 'centro' } });
    expect(JSON.stringify(body)).not.toMatch(/argon2|hash|version/i);
  });

  it('logout revoca el token: después responde 401', async () => {
    const { token } = await registrarEIngresar();
    await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${token}`).expect(204);
    await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`).expect(401);
  });

  it('una cuenta deshabilitada pierde el acceso aunque su token no haya vencido', async () => {
    const { datos, token } = await registrarEIngresar();
    await pool.query(`UPDATE usuario SET estado = 'deshabilitado' WHERE correo = $1`, [datos.correo]);
    await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`).expect(401);
    await request(app).post('/api/auth/login').send({ correo: datos.correo, contrasena: datos.contrasena }).expect(401);
  });

  it('un cliente recibe 403 en una ruta solo para administración', async () => {
    const appRol = express();
    appRol.get('/solo-administracion', autenticar, autorizar('administracion'), (req, res) => res.json({ ok: true }));
    appRol.use(manejadorErrores);
    const { token } = await registrarEIngresar();
    const { body } = await request(appRol).get('/solo-administracion').set('Authorization', `Bearer ${token}`).expect(403);
    expect(body.error.codigo).toBe('PERMISO_DENEGADO');
  });
});
