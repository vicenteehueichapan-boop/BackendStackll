import { z } from 'zod';

// Parámetros de GET /api/productos (mismos filtros del catálogo de React: búsqueda y categoría).
export const esquemaFiltrosProductos = z.object({
  busqueda: z.string().trim().max(60).optional(),
  categoria: z.string().trim().max(60).optional(),
}).strict();

export const esquemaCodigoProducto = z.object({
  codigo: z.string().regex(/^[A-Z]{2}[0-9]{3}$/, 'El código debe tener 2 letras mayúsculas y 3 números.'),
});
