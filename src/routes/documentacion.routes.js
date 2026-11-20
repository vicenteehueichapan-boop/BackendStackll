import fs from 'node:fs';
import { Router } from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';

// Documentación viva: la especificación OpenAPI vive junto al código y Swagger UI la presenta.
const especificacion = YAML.parse(fs.readFileSync(new URL('../../docs/openapi.yaml', import.meta.url), 'utf8'));

export const documentacionRoutes = Router();
const politicaHttpLaboratorio = helmet.contentSecurityPolicy({
  directives: { upgradeInsecureRequests: null },
});

documentacionRoutes.get('/openapi.json', (req, res) => res.json(especificacion));
documentacionRoutes.use('/docs', (req, res, next) => {
  if (req.secure) return next();
  // Swagger por la IP HTTP del laboratorio debe cargar sus recursos por HTTP.
  // Se mantiene el resto de CSP; HTTPS conserva las cabeceras originales.
  res.removeHeader('Cross-Origin-Opener-Policy');
  res.removeHeader('Origin-Agent-Cluster');
  return politicaHttpLaboratorio(req, res, next);
});
documentacionRoutes.use('/docs', swaggerUi.serve, swaggerUi.setup(especificacion, {
  customSiteTitle: 'API Gas El Volcán',
  swaggerOptions: { persistAuthorization: false },
}));
