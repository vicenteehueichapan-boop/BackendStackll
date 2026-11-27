import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { crearApp } from '../../src/app.js';
import { pool } from '../../src/config/baseDatos.js';
import { hashearContrasena } from '../../src/security/contrasenas.js';

const ruta = '/api/v1/kaiju';
const app = request(crearApp());
const contrasena = 'SoloPruebasKaiju2026';
const correoAdmin = 'kaiju-prueba-admin@ejemplo.cl';
const ingreso = (correo, clave = contrasena) =>
  app.post(`${ruta}/auth/login`).send({ correo, contrasena: clave });
const bearer = (token) => `Bearer ${token}`;
let admin;

beforeAll(async () => {
  const hash = await hashearContrasena(contrasena);
  await pool.query(`INSERT INTO kaiju_usuario (nombre,apellidos,correo,rol,hash_contrasena)
    VALUES ('Admin','Kaiju',$1,'administrador',$2)`, [correoAdmin, hash]);
  await pool.query(`INSERT INTO usuario (nombre,apellidos,correo,rol,hash_contrasena)
    VALUES ('Admin','Volcán',$1,'administracion',$2)`, [correoAdmin, hash]);
  ({ body: admin } = await ingreso(correoAdmin.toUpperCase()).expect(200));
});

afterAll(() => pool.end());

describe('Backend compartido de Kaiju y Gas El Volcán', () => {
  it('autentica en Kaiju, rechaza cuentas inexistentes y separa ambas audiencias', async () => {
    expect(admin.usuario.rol).toBe('administrador');
    expect(admin.expiresIn).toBeGreaterThan(0);
    const inexistente = await ingreso('kaiju-prueba-inexistente@ejemplo.cl').expect(401);
    const incorrecta = await ingreso(correoAdmin, 'incorrecta').expect(401);
    expect(inexistente.body).toEqual(incorrecta.body);
    await app.get('/api/v1/usuarios').set('Authorization', bearer(admin.accessToken)).expect(401);
    const web = await app.post('/api/v1/auth/login').send({ correo: correoAdmin, contrasena }).expect(200);
    await app.get(`${ruta}/usuarios`).set('Authorization', bearer(web.body.accessToken)).expect(401);
  });

  it('crea, lista, edita y elimina un vendedor con persistencia y permisos', async () => {
    const datos = {
      nombre: 'Ana', apellidos: 'Vendedora', correo: 'kaiju-prueba-venta@ejemplo.cl',
      rol: 'vendedor', contrasena,
    };
    const autorizacion = bearer(admin.accessToken);
    await app.get(`${ruta}/usuarios`).expect(401);
    await app.post(`${ruta}/usuarios`).set('Authorization', autorizacion).send({ ...datos, rol: 'operadora' }).expect(400);
    const { body: creada } = await app.post(`${ruta}/usuarios`).set('Authorization', autorizacion).send(datos).expect(201);
    const duplicada = await app.post(`${ruta}/usuarios`).set('Authorization', autorizacion).send(datos).expect(409);
    expect(duplicada.body.error.detalles.correo).toBeTruthy();
    const listado = await app.get(`${ruta}/usuarios`).set('Authorization', autorizacion).expect(200);
    expect(listado.body).toContainEqual(creada);
    expect(creada).toEqual({ id: creada.id, nombre: datos.nombre, apellidos: datos.apellidos, correo: datos.correo, rol: datos.rol });
    const { body: vendedor } = await ingreso(datos.correo).expect(200);
    await app.get(`${ruta}/usuarios`).set('Authorization', bearer(vendedor.accessToken)).expect(403);
    await app.post(`${ruta}/usuarios`).set('Authorization', bearer(vendedor.accessToken)).send(datos).expect(403);
    const cuenta = `${ruta}/usuarios/${creada.id}`;
    await app.patch(cuenta).set('Authorization', autorizacion).send({ nombre: 'Andrea' }).expect(200);
    expect((await ingreso(datos.correo).expect(200)).body.usuario.nombre).toBe('Andrea');
    await app.patch(cuenta).set('Authorization', autorizacion).send({ rol: 'encargado_inventario' }).expect(200);
    await app.post(`${ruta}/auth/logout`).set('Authorization', bearer(vendedor.accessToken)).expect(401);
    expect((await ingreso(datos.correo).expect(200)).body.usuario.rol).toBe('encargado_inventario');
    await app.delete(cuenta).set('Authorization', autorizacion).expect(204);
    await ingreso(datos.correo).expect(401);
    const final = await app.get(`${ruta}/usuarios`).set('Authorization', autorizacion).expect(200);
    expect(final.body.some((usuario) => usuario.id === creada.id)).toBe(false);
  });

  it('protege al propio administrador y revoca su sesión al salir', async () => {
    const autorizacion = bearer(admin.accessToken);
    const cuenta = `${ruta}/usuarios/${admin.usuario.id}`;
    await app.patch(cuenta).set('Authorization', autorizacion).send({ rol: 'vendedor' }).expect(409);
    await app.delete(cuenta).set('Authorization', autorizacion).expect(409);
    await app.post(`${ruta}/auth/logout`).set('Authorization', autorizacion).expect(204);
    await app.get(`${ruta}/usuarios`).set('Authorization', autorizacion).expect(401);
    await ingreso(correoAdmin).expect(200);
  });
});
