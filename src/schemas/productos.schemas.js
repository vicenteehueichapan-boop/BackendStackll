import { z } from 'zod';

// Parámetros de GET /api/productos (mismos filtros del catálogo de React: búsqueda y categoría).
export const esquemaFiltrosProductos = z.object({
  busqueda: z.string().trim().max(60).optional(),
  categoria: z.string().trim().max(60).optional(),
}).strict();

export const esquemaCodigoProducto = z.object({
  codigo: z.string().regex(/^[A-Z]{2}[0-9]{3}$/, 'El código debe tener 2 letras mayúsculas y 3 números.'),
});

export const esquemaProducto = z.object({
  codigo: esquemaCodigoProducto.shape.codigo,
  nombre: z.string().trim().min(3).max(100),
  descripcion: z.string().trim().max(500),
  unidad: z.string().trim().min(1).max(50),
  categoria: z.string().trim().min(3).max(60),
  precioResidencial: z.number().int().min(1).max(2147483647),
  precioComercial: z.number().int().min(1).max(2147483647),
  stock: z.number().int().min(0).max(2147483647),
  destacado: z.boolean().default(false),
}).strict();
