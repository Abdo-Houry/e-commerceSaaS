import 'reflect-metadata';
import { env } from './config/env';
import { AppDataSource } from './config/data-source';
import { createApp } from './app';
import { db } from './config/env';
import { refreshDemoData } from './scripts/demo-refresh';

async function main() {
  let dbReady = false;
  try {
    await AppDataSource.initialize();
    dbReady = true;
    console.log(`Database connected (${db.host}:${db.port}/${db.database})`);
  } catch (err) {
    // Keep the server up so /api/health can report db: "down".
    console.error('Database connection failed:', err instanceof Error ? err.message : err);
  }

  const app = createApp();
  app.listen(env.API_PORT, () => {
    console.log(`API listening on http://localhost:${env.API_PORT}`);
    // After listening, so a slow re-seed never delays the health check.
    if (dbReady && env.DEMO_MODE) {
      refreshDemoData().catch((err: unknown) => console.error('Demo refresh failed:', err instanceof Error ? err.message : err));
    }
  });
}

void main();
