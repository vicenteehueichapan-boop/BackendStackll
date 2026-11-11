import { hashearContrasena } from '../src/security/contrasenas.js';
import { productos, zonas } from './catalogo.js';

// Perfiles ficticios del personal (src/data/personalDemostracion.js del frontend).
// La contraseña no se escribe aquí: llega desde la variable SEMILLA_CONTRASENA_DEMO.
const personalDemo = [
  { correo: 'administracion@ejemplo.cl', nombre: 'Administración', apellidos: 'Demo', rol: 'administracion' },
  { correo: 'operadora@ejemplo.cl', nombre: 'Operadora', apellidos: 'Demo', rol: 'operadora' },
  { correo: 'repartidor1@ejemplo.cl', nombre: 'Repartidor', apellidos: 'Uno', rol: 'repartidor' },
  { correo: 'repartidor2@ejemplo.cl', nombre: 'Repartidor', apellidos: 'Dos', rol: 'repartidor' },
  { correo: 'repartidor3@ejemplo.cl', nombre: 'Repartidor', apellidos: 'Tres', rol: 'repartidor' },
];

export async function sembrarCatalogo(db) {
  for (const zona of zonas) {
    await db.query(
      `INSERT INTO zona_despacho (id, nombre, comunas, dias, horario, tiempo_estimado)
       VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING`,
      [zona.id, zona.nombre, zona.comunas, zona.dias, zona.horario, zona.tiempoEstimado],
    );
  }
  const categorias = [...new Set(productos.map((producto) => producto.categoria))];
  for (const nombre of categorias) {
    await db.query('INSERT INTO categoria (nombre) VALUES ($1) ON CONFLICT (nombre) DO NOTHING', [nombre]);
  }
  for (const producto of productos) {
    await db.query(
      `INSERT INTO producto (codigo, nombre, descripcion, unidad, categoria_id, precio_residencial,
                             precio_comercial, stock, destacado)
       SELECT $1, $2, $3, $4, id, $6, $7, $8, $9 FROM categoria WHERE nombre = $5
       ON CONFLICT (codigo) DO NOTHING`,
      [producto.codigo, producto.nombre, producto.descripcion, producto.unidad, producto.categoria,
        producto.precioResidencial, producto.precioComercial, producto.stock, producto.destacado],
    );
  }
  return { zonas: zonas.length, categorias: categorias.length, productos: productos.length };
}

export async function sembrarPersonalDemo(db, contrasena) {
  const hash = await hashearContrasena(contrasena);
  let nuevos = 0;
  for (const persona of personalDemo) {
    const { rowCount } = await db.query(
      `INSERT INTO usuario (correo, nombre, apellidos, hash_contrasena, rol)
       VALUES ($1, $2, $3, $4, $5) ON CONFLICT (correo) DO NOTHING`,
      [persona.correo, persona.nombre, persona.apellidos, hash, persona.rol],
    );
    nuevos += rowCount;
  }
  return nuevos;
}
