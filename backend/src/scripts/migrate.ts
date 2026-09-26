// Runs pending migrations from the compiled build — used as the release step on hosts
// that have no shell (Render, Railway): `node dist/scripts/migrate.js && node dist/server.js`.
import 'reflect-metadata';
import { AppDataSource } from '../config/data-source';
import { createDatabaseIfMissing } from './create-db';

async function main() {
  await createDatabaseIfMissing();
  await AppDataSource.initialize();
  await AppDataSource.query('CREATE EXTENSION IF NOT EXISTS citext');
  await AppDataSource.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  const applied = await AppDataSource.runMigrations({ transaction: 'all' });
  console.log(applied.length ? `Migrations applied: ${applied.map((m) => m.name).join(', ')}` : 'Migrations: already up to date');
  await AppDataSource.destroy();
}

main().catch(async (err: unknown) => {
  console.error('migrate failed:', err instanceof Error ? err.message : err);
  if (AppDataSource.isInitialized) await AppDataSource.destroy();
  process.exit(1);
});
