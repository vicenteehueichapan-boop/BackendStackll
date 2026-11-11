// Error esperado de la API: lleva el estado HTTP y un código estable que el frontend puede usar.
export class ErrorApi extends Error {
  constructor(estado, codigo, mensaje, detalles) {
    super(mensaje);
    this.estado = estado;
    this.codigo = codigo;
    this.detalles = detalles;
  }
}
