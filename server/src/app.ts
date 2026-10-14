import path from 'node:path';
import express from 'express';
import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config/unifiedConfig.js';
import { v1Routes } from './routes/v1.js';
import { AppError } from './lib/errors.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(compression());
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(
    cors({
      origin: config.corsOrigin.split(',').map((o) => o.trim()),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(
    '/uploads',
    express.static(path.resolve(process.cwd(), config.upload.dir), {
      maxAge: config.isProd ? '7d' : 0,
      fallthrough: true,
    }),
  );

  app.use('/api/v1', v1Routes);

  // Vietmap tile/style proxy for production (Vite dev proxy covers local).
  // Reaches this service via top-level rewrite /vietmap/* -> server service;
  // Express sees the original path, so mount here. Forwards path+query
  // transparently (client keeps its own tilemap apikey, same as dev).
  app.use('/vietmap', async (req, res, next) => {
    try {
      const upstream = await fetch(`https://maps.vietmap.vn${req.url}`, {
        headers: { accept: req.headers.accept ?? '*/*' },
      });
      res.status(upstream.status);
      upstream.headers.forEach((v, k) => {
        if (!['content-encoding', 'content-length', 'transfer-encoding', 'connection'].includes(k.toLowerCase())) {
          res.setHeader(k, v);
        }
      });
      if (!upstream.body) return res.end();
      res.send(Buffer.from(await upstream.arrayBuffer()));
    } catch {
      next(AppError.internal('Vietmap proxy lỗi.'));
    }
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
