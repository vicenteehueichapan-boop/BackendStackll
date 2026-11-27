import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { entorno } from './config/entorno.js';
import { registro } from './config/registro.js';
import { manejadorErrores, rutaNoEncontrada } from './errores/manejadorErrores.js';
import { authRoutes } from './routes/auth.routes.js';
import { kaijuRoutes } from './routes/kaiju.routes.js';
import { documentacionRoutes } from './routes/documentacion.routes.js';
import { productosRoutes } from './routes/productos.routes.js';
import { usuariosRoutes } from './routes/usuarios.routes.js';
import { pedidosRoutes } from './routes/pedidos.routes.js';
import { referenciasRoutes } from './routes/referencias.routes.js';

export function crearApp() {
  const app = express();
  app.disable('x-powered-by');
  // Solo el proxy local puede comunicar la IP real; no se confía en proxies de Internet.
  app.set('trust proxy', 'loopback');

  app.use(helmet());
  // CORS: solo los orígenes del frontend definidos en .env. No reemplaza a la autorización.
  app.use(cors({
    origin: entorno.ORIGENES_PERMITIDOS,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  app.use(express.json({ limit: '20kb' }));
  app.use(pinoHttp({ logger: registro }));

  app.use('/api/v1', documentacionRoutes);
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/kaiju', kaijuRoutes);
  app.use('/api/v1/productos', productosRoutes);
  app.use('/api/v1/usuarios', usuariosRoutes);
  app.use('/api/v1/pedidos', pedidosRoutes);
  app.use('/api/v1', referenciasRoutes);

  app.use(rutaNoEncontrada);
  app.use(manejadorErrores);
  return app;
}
