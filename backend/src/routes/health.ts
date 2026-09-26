import { Router } from 'express';
import type { ApiSuccess, Health } from '@matjari/shared';
import { AppDataSource } from '../config/data-source';

export const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
  let db: Health['db'] = 'down';
  if (AppDataSource.isInitialized) {
    try {
      await AppDataSource.query('SELECT 1');
      db = 'up';
    } catch {
      db = 'down';
    }
  }

  const body: ApiSuccess<Health> = {
    data: { status: 'ok', uptime: process.uptime(), db, timestamp: new Date().toISOString() },
  };
  res.status(200).json(body);
});
