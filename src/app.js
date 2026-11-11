import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { entorno } from './config/entorno.js';
import { registro } from './config/registro.js';
import { manejadorErrores, rutaNoEncontrada } from './errores/manejadorErrores.js';
import { authRoutes } from './routes/auth.routes.js';
import { documentacionRoutes } from './routes/documentacion.routes.js';
import { productosRoutes } from './routes/productos.routes.js';

export function crearApp() {
  const app = express();
  app.disable('x-powered-by');

  app.use(helmet());
  // CORS: solo los orígenes del frontend definidos en .env. No reemplaza a la autorización.
  app.use(cors({
    origin: entorno.ORIGENES_PERMITIDOS,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  app.use(express.json({ limit: '20kb' }));
  app.use(pinoHttp({ logger: registro }));

  app.use('/api', documentacionRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/productos', productosRoutes);

  app.use(rutaNoEncontrada);
  app.use(manejadorErrores);
  return app;
}
