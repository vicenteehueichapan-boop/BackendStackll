import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SignJWT } from 'jose';
import { crearApp } from '../../src/app.js';
import { pool } from '../../src/config/baseDatos.js';
import { entorno } from '../../src/config/entorno.js';
import { hashearContrasena } from '../../src/security/contrasenas.js';

const app = crearApp();
const prefijo = 'flujo-ep3-';
const cuentas = {};
const tokens = {};
let pedido;
const producto = { codigo:'ZZ991', nombre:'Cilindro de prueba', descripcion:'Registro ficticio para pruebas aisladas',
  unidad:'Unidad', categoria:'Cilindros de Gas', precioResidencial:1000, precioComercial:900, stock:4, destacado:false };
const cabecera = (rol) => ({ Authorization:`Bearer ${tokens[rol]}` });
const entradaPedido = (cambios={}) => ({nombre:'Ana',apellidos:'Pruebas',correo:'ana@ejemplo.cl',direccion:'Calle ficticia 123',
  zonaId:'centro',tipoCliente:'residencial',lineas:[{codigo:'ZZ991',cantidad:1,precioEsperado:1000}],...cambios});

beforeAll(async () => {
  const hash = await hashearContrasena('Pruebas2026!');
  for (const [indice, rol] of ['administracion','operadora','repartidor','repartidorOtro','cliente','clienteOtro'].entries()) {
    const { rows } = await pool.query(`INSERT INTO usuario (nombre,apellidos,correo,rol,hash_contrasena)
      VALUES ('Usuario','Pruebas',$1,$2,$3) RETURNING id`, [`${prefijo}${rol.toLowerCase()}@ejemplo.cl`, rol.replace('Otro',''),hash]);
    cuentas[rol]=rows[0].id;
    if (rol.startsWith('cliente')) await pool.query("INSERT INTO perfil_cliente (usuario_id,run,tipo_cliente) VALUES ($1,$2,'residencial')",[rows[0].id,`2800000${indice}K`]);
    const respuesta = await request(app).post('/api/v1/auth/login').send({correo:`${prefijo}${rol.toLowerCase()}@ejemplo.cl`,contrasena:'Pruebas2026!'}).expect(200);
    tokens[rol]=respuesta.body.accessToken;
  }
});

afterAll(async () => {
  await pool.query('DELETE FROM pedido WHERE usuario_id=ANY($1::uuid[])',[Object.values(cuentas)]);
  await pool.query("DELETE FROM producto WHERE codigo IN ('ZZ991','ZZ992')");
  await pool.query('DELETE FROM usuario WHERE correo LIKE $1',[`${prefijo}%`]);
  await pool.end();
});

describe('CRUD de usuarios y permisos reales', () => {
  it('exige autenticación y rol administrador para listar y crear personal', async () => {
    await request(app).get('/api/v1/usuarios').expect(401);
    await request(app).get('/api/v1/usuarios').set(cabecera('cliente')).expect(403);
    const {body}=await request(app).get('/api/v1/usuarios').set(cabecera('administracion')).expect(200);
    expect(body.some((usuario)=>usuario.id===cuentas.cliente)).toBe(true);
    expect(JSON.stringify(body)).not.toMatch(/hashContrasena|versionSesion|argon2/);
    await request(app).post('/api/v1/usuarios').set(cabecera('operadora')).send({}).expect(403);
  });
  it('un cliente consulta su cuenta y no la de otra persona', async () => {
    await request(app).get(`/api/v1/usuarios/${cuentas.cliente}`).set(cabecera('cliente')).expect(200);
    await request(app).get(`/api/v1/usuarios/${cuentas.clienteOtro}`).set(cabecera('cliente')).expect(403);
    await request(app).patch(`/api/v1/usuarios/${cuentas.clienteOtro}`).set(cabecera('cliente')).send({nombre:'Intruso'}).expect(403);
  });
  it('crea, modifica y desactiva personal; revoca tokens emitidos antes del cambio', async () => {
    const {body:creado}=await request(app).post('/api/v1/usuarios').set(cabecera('administracion')).send({
      nombre:'Nueva',apellidos:'Operadora',correo:`${prefijo}nueva@ejemplo.cl`,contrasena:'Pruebas2026!',rol:'operadora'}).expect(201);
    const {body:ingreso}=await request(app).post('/api/v1/auth/login').send({correo:creado.correo,contrasena:'Pruebas2026!'}).expect(200);
    await request(app).patch(`/api/v1/usuarios/${creado.id}`).set(cabecera('administracion')).send({rol:'repartidor'}).expect(200);
    await request(app).get('/api/v1/auth/me').set('Authorization',`Bearer ${ingreso.accessToken}`).expect(401);
    await request(app).delete(`/api/v1/usuarios/${creado.id}`).set(cabecera('administracion')).expect(204);
    await request(app).post('/api/v1/auth/login').send({correo:creado.correo,contrasena:'Pruebas2026!'}).expect(401);
  });
  it('rechaza campos no permitidos y cambios entre cliente y personal', async () => {
    await request(app).patch(`/api/v1/usuarios/${cuentas.cliente}`).set(cabecera('administracion')).send({versionSesion:0}).expect(400);
    await request(app).patch(`/api/v1/usuarios/${cuentas.cliente}`).set(cabecera('administracion')).send({rol:'administracion'}).expect(409);
  });
  it('conserva al último administrador activo', async () => {
    const {body}=await request(app).delete(`/api/v1/usuarios/${cuentas.administracion}`).set(cabecera('administracion')).expect(409);
    expect(body.error.codigo).toBe('ULTIMO_ADMINISTRADOR');
  });
  it('un JWT vencido recibe 401 en una ruta real', async () => {
    const token=await new SignJWT({ver:0}).setProtectedHeader({alg:'HS256'}).setSubject(cuentas.cliente)
      .setIssuer(entorno.JWT_EMISOR).setAudience(entorno.JWT_AUDIENCIA).setJti('vencido')
      .setIssuedAt(Math.floor(Date.now()/1000)-100).setExpirationTime(Math.floor(Date.now()/1000)-10)
      .sign(Buffer.from(entorno.JWT_SECRETO,'base64'));
    await request(app).get('/api/v1/pedidos').set('Authorization',`Bearer ${token}`).expect(401);
  });
});

describe('catálogo y flujo completo del pedido', () => {
  it('solo administración crea y modifica productos; valida y conserva unicidad', async () => {
    await request(app).post('/api/v1/productos').set(cabecera('cliente')).send(producto).expect(403);
    await request(app).post('/api/v1/productos').set(cabecera('administracion')).send({...producto,stock:-1}).expect(400);
    await request(app).post('/api/v1/productos').set(cabecera('administracion')).send(producto).expect(201);
    await request(app).post('/api/v1/productos').set(cabecera('administracion')).send(producto).expect(409);
    const {body}=await request(app).put('/api/v1/productos/ZZ991').set(cabecera('administracion')).send({...producto,nombre:'Producto actualizado'}).expect(200);
    expect(body.nombre).toBe('Producto actualizado');
    await request(app).post('/api/v1/productos').set(cabecera('administracion')).send({...producto,codigo:'ZZ992',categoria:'No existe'}).expect(400);
  });
  it('un precio cambiado o stock insuficiente produce 409 sin descontar ni crear pedidos', async () => {
    await request(app).post('/api/v1/pedidos').set(cabecera('cliente')).send(entradaPedido({lineas:[{codigo:'ZZ991',cantidad:1,precioEsperado:999}]})).expect(409);
    await request(app).post('/api/v1/pedidos').set(cabecera('cliente')).send(entradaPedido({lineas:[{codigo:'ZZ991',cantidad:5,precioEsperado:1000}]})).expect(409);
    const {body}=await request(app).get('/api/v1/productos/ZZ991').expect(200);
    expect(body.stock).toBe(4);
    const lista=await request(app).get('/api/v1/pedidos').set(cabecera('cliente')).expect(200);
    expect(lista.body).toHaveLength(0);
  });
  it('rechaza la propiedad o el total enviados por el cliente', async () => {
    await request(app).post('/api/v1/pedidos').set(cabecera('cliente')).send({...entradaPedido(),clienteId:cuentas.clienteOtro,total:1}).expect(400);
  });
  it('calcula precios, total y dueño en el servidor y descuenta stock', async () => {
    const {body}=await request(app).post('/api/v1/pedidos').set(cabecera('cliente')).send(entradaPedido({tipoCliente:'comercial'})).expect(201);
    pedido=body;
    expect(body).toMatchObject({clienteId:cuentas.cliente,total:1000,tipoCliente:'residencial',estado:'pendiente'});
    expect(body.lineas[0]).toMatchObject({precioUnitario:1000,cantidad:1});
    expect((await request(app).get('/api/v1/productos/ZZ991')).body.stock).toBe(3);
    const segundaApp=crearApp();
    await request(segundaApp).get(`/api/v1/pedidos/${pedido.id}`).set(cabecera('cliente')).expect(200);
  });
  it('cada cliente solo lista lo suyo y no consulta pedidos ajenos', async () => {
    const {body}=await request(app).get('/api/v1/pedidos').set(cabecera('clienteOtro')).expect(200);
    expect(body).toEqual([]);
    await request(app).get(`/api/v1/pedidos/${pedido.id}`).set(cabecera('clienteOtro')).expect(403);
    await request(app).delete(`/api/v1/pedidos/${pedido.id}`).set(cabecera('clienteOtro')).expect(403);
  });
  it('no pasa a en camino sin repartidor (409) ni acepta saltos', async () => {
    const {body}=await request(app).patch(`/api/v1/pedidos/${pedido.id}/estado`).set(cabecera('operadora')).send({estado:'en_camino'}).expect(409);
    expect(body.error.codigo).toBe('SIN_REPARTIDOR');
    await request(app).patch(`/api/v1/pedidos/${pedido.id}/estado`).set(cabecera('operadora')).send({estado:'entregado'}).expect(409);
  });
  it('asigna solo a un repartidor activo y prohíbe autoasignarse a un cliente', async () => {
    await request(app).patch(`/api/v1/pedidos/${pedido.id}/asignacion`).set(cabecera('cliente')).send({repartidorId:cuentas.repartidor}).expect(403);
    await request(app).patch(`/api/v1/pedidos/${pedido.id}/asignacion`).set(cabecera('operadora')).send({repartidorId:cuentas.cliente}).expect(409);
    const {body}=await request(app).patch(`/api/v1/pedidos/${pedido.id}/asignacion`).set(cabecera('operadora')).send({repartidorId:cuentas.repartidor}).expect(200);
    expect(body).toMatchObject({estado:'asignado',repartidorId:cuentas.repartidor});
  });
  it('un repartidor no ve ni cambia pedidos ajenos (403)', async () => {
    const {body}=await request(app).get('/api/v1/pedidos').set(cabecera('repartidorOtro')).expect(200);
    expect(body).toEqual([]);
    await request(app).get(`/api/v1/pedidos/${pedido.id}`).set(cabecera('repartidorOtro')).expect(403);
    await request(app).patch(`/api/v1/pedidos/${pedido.id}/estado`).set(cabecera('repartidorOtro')).send({estado:'en_camino'}).expect(403);
  });
  it('no desactiva al repartidor con entregas pendientes ni borra pedidos en curso', async () => {
    await request(app).delete(`/api/v1/usuarios/${cuentas.repartidor}`).set(cabecera('administracion')).expect(409);
    await request(app).delete(`/api/v1/pedidos/${pedido.id}`).set(cabecera('cliente')).expect(409);
  });
  it('el repartidor asignado avanza la secuencia y se registra efectivo al entregar', async () => {
    await request(app).patch(`/api/v1/pedidos/${pedido.id}/estado`).set(cabecera('repartidor')).send({estado:'en_camino'}).expect(200);
    const {body}=await request(app).patch(`/api/v1/pedidos/${pedido.id}/estado`).set(cabecera('repartidor')).send({estado:'entregado'}).expect(200);
    expect(body.cobradoEn).toBeTruthy();
    expect(body.estado).toBe('entregado');
    await request(app).patch(`/api/v1/pedidos/${pedido.id}/estado`).set(cabecera('repartidor')).send({estado:'en_camino'}).expect(409);
  });
  it('un producto con pedidos conserva su referencia y responde 409 al eliminar', async () => {
    const respuesta = await request(app).delete('/api/v1/productos/ZZ991').set(cabecera('administracion'));
    expect(respuesta.body).toMatchObject({error:{codigo:'PRODUCTO_EN_USO'}});
    expect(respuesta.status).toBe(409);
  });
  it('dos solicitudes concurrentes no venden más stock del disponible', async () => {
    await pool.query("UPDATE producto SET stock=1 WHERE codigo='ZZ991'");
    const respuestas=await Promise.all([0,1].map(()=>request(app).post('/api/v1/pedidos').set(cabecera('cliente')).send(entradaPedido())));
    expect(respuestas.map((r)=>r.status).sort()).toEqual([201,409]);
    expect((await request(app).get('/api/v1/productos/ZZ991')).body.stock).toBe(0);
    const creado=respuestas.find((r)=>r.status===201).body;
    await request(app).delete(`/api/v1/pedidos/${creado.id}`).set(cabecera('cliente')).expect(204);
    expect((await request(app).get('/api/v1/productos/ZZ991')).body.stock).toBe(1);
  });
  it('el catálogo permite eliminar un producto sin pedidos y Swagger cubre los CRUD', async () => {
    await request(app).post('/api/v1/productos').set(cabecera('administracion')).send({...producto,codigo:'ZZ992'}).expect(201);
    await request(app).delete('/api/v1/productos/ZZ992').set(cabecera('administracion')).expect(204);
    await request(app).get('/api/v1/productos/ZZ992').expect(404);
    const {body}=await request(app).get('/api/v1/openapi.json').expect(200);
    for(const ruta of ['/api/v1/usuarios/{id}','/api/v1/productos/{codigo}','/api/v1/pedidos/{id}']) expect(body.paths[ruta].delete).toBeTruthy();
  });
});

