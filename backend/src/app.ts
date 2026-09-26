import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { env, isProd, uploadRoot } from './config/env';
import { healthRouter } from './routes/health';
import { authRouter } from './routes/auth.routes';
import { storeRouter } from './routes/store.routes';
import { categoryRouter, deliveryZoneRouter, productRouter } from './routes/catalog.routes';
import { orderRouter, statsRouter } from './routes/order.routes';
import { publicRouter } from './routes/public.routes';
import { uploadRouter } from './routes/upload.routes';
import { adminRouter, platformPublicRouter, subscriptionRouter } from './routes/admin.routes';
import { errorHandler, notFoundHandler } from './middleware/error-handler';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(
    cors({
      origin: (origin, cb) => {
        // No Origin header: same-origin, curl, or server-to-server (Next.js SSR).
        if (!origin || env.CORS_ORIGINS.includes(origin)) return cb(null, true);
        cb(null, false);
      },
      credentials: true,
    }),
  );
  app.use(compression());
  if (env.NODE_ENV !== 'test') app.use(morgan(isProd ? 'combined' : 'dev'));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.use(
    '/uploads',
    express.static(uploadRoot, {
      maxAge: '30d',
      immutable: true,
      index: false,
      dotfiles: 'deny',
      setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
    }),
  );

  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/store', storeRouter);
  app.use('/api/categories', categoryRouter);
  app.use('/api/products', productRouter);
  app.use('/api/delivery-zones', deliveryZoneRouter);
  app.use('/api/orders', orderRouter);
  app.use('/api/stats', statsRouter);
  app.use('/api/uploads', uploadRouter);
  app.use('/api/public/platform', platformPublicRouter);
  app.use('/api/public', publicRouter);
  app.use('/api/subscription', subscriptionRouter);
  app.use('/api/admin', adminRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
