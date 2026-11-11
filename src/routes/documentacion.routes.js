import fs from 'node:fs';
import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';

// Documentación viva: la especificación OpenAPI vive junto al código y Swagger UI la presenta.
const especificacion = YAML.parse(fs.readFileSync(new URL('../../docs/openapi.yaml', import.meta.url), 'utf8'));

export const documentacionRoutes = Router();

documentacionRoutes.get('/openapi.json', (req, res) => res.json(especificacion));
documentacionRoutes.use('/docs', swaggerUi.serve, swaggerUi.setup(especificacion, {
  customSiteTitle: 'API Gas El Volcán',
  swaggerOptions: { persistAuthorization: false },
}));
