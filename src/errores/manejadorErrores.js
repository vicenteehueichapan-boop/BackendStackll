import { ZodError } from 'zod';
import { ErrorApi } from './ErrorApi.js';

// Formato único de error: { error: { codigo, mensaje, detalles? } }.
// Los errores del cliente (4xx) se explican; los del sistema (5xx) se registran sin exponer el detalle.
export function rutaNoEncontrada(req, res) {
  res.status(404).json({ error: { codigo: 'RUTA_NO_ENCONTRADA', mensaje: 'La ruta solicitada no existe.' } });
}

export function manejadorErrores(error, req, res, _next) {
  if (error instanceof ErrorApi) {
    return res.status(error.estado).json({
      error: { codigo: error.codigo, mensaje: error.message, ...(error.detalles && { detalles: error.detalles }) },
    });
  }
  if (error instanceof ZodError) {
    // Un mensaje por campo, igual que muestra el formulario de React junto a cada campo.
    const detalles = Object.fromEntries(error.issues.map((problema) => [problema.path.join('.') || 'cuerpo', problema.message]));
    return res.status(400).json({ error: { codigo: 'VALIDACION', mensaje: 'Revisa los datos enviados.', detalles } });
  }
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { codigo: 'JSON_INVALIDO', mensaje: 'El cuerpo debe ser un JSON válido.' } });
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ error: { codigo: 'CUERPO_DEMASIADO_GRANDE', mensaje: 'El cuerpo supera el tamaño permitido.' } });
  }
  req.log.error({ err: error }, 'error no controlado');
  return res.status(500).json({ error: { codigo: 'ERROR_INTERNO', mensaje: 'Ocurrió un error inesperado. Intenta nuevamente.' } });
}
