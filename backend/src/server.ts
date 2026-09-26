import 'reflect-metadata';
import { env } from './config/env';
import { AppDataSource } from './config/data-source';
import { createApp } from './app';

async function main() {
  try {
    await AppDataSource.initialize();
    console.log(`Database connected (${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME})`);
  } catch (err) {
    // Keep the server up so /api/health can report db: "down".
    console.error('Database connection failed:', err instanceof Error ? err.message : err);
  }

  const app = createApp();
  app.listen(env.API_PORT, () => {
    console.log(`API listening on http://localhost:${env.API_PORT}`);
  });
}

void main();
