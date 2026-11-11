import { registro } from '../config/registro.js';
import { ErrorApi } from '../errores/ErrorApi.js';

// Se usa después de autenticar(). Cerrado por defecto: si el rol no está en la lista, 403.
// La propiedad de cada registro (por ejemplo, un pedido ajeno) se comprueba además en el servicio.
export function autorizar(...rolesPermitidos) {
  return (req, res, next) => {
    if (!rolesPermitidos.includes(req.usuario?.rol)) {
      registro.info({ usuarioId: req.usuario?.id, rol: req.usuario?.rol, ruta: req.originalUrl }, 'permiso denegado');
      throw new ErrorApi(403, 'PERMISO_DENEGADO', 'No tienes permiso para realizar esta acción.');
    }
    next();
  };
}
