import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { crearApp } from '../../src/app.js';
import { pool } from '../../src/config/baseDatos.js';

const app = crearApp();
afterAll(() => pool.end());

describe('catálogo', () => {
  it('lista los 14 productos sembrados desde el frontend, ordenados por código', async () => {
    const { body } = await request(app).get('/api/productos').expect(200);
    expect(body).toHaveLength(14);
    expect(body[0]).toMatchObject({ codigo: 'AC001', categoria: 'Accesorios' });
  });

  it('filtra por categoría y por búsqueda', async () => {
    const porCategoria = await request(app).get('/api/productos').query({ categoria: 'Reguladores' }).expect(200);
    expect(porCategoria.body.map((producto) => producto.codigo)).toEqual(['RG001', 'RG002', 'RG003']);
    const porBusqueda = await request(app).get('/api/productos').query({ busqueda: '11 kg' }).expect(200);
    expect(porBusqueda.body.map((producto) => producto.codigo)).toContain('CL002');
  });

  it('muestra el detalle con las dos tarifas', async () => {
    const { body } = await request(app).get('/api/productos/CL002').expect(200);
    expect(body).toMatchObject({ precioResidencial: 12000, precioComercial: 11000, destacado: true });
  });

  it('responde 404 si el código no existe y 400 si el formato es inválido', async () => {
    await request(app).get('/api/productos/ZZ999').expect(404);
    await request(app).get('/api/productos/cl002').expect(400);
  });
});

describe('documentación viva', () => {
  it('publica la especificación OpenAPI y Swagger UI', async () => {
    const { body } = await request(app).get('/api/openapi.json').expect(200);
    expect(body.paths['/api/auth/login'].post['x-estado']).toBe('implementado');
    await request(app).get('/api/docs/').expect(200).expect('Content-Type', /html/);
  });
});
