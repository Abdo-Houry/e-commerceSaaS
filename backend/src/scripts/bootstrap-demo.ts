// Turns an empty database into a complete, explorable demo: migrations, platform
// settings with placeholder payment details, the demo storefront, a sample merchant
// with orders, and an admin account.
//
// Usage: npm run bootstrap:demo -- --admin-email you@example.com --admin-password "strong-password"
//        (DATABASE_URL or the DB_* variables decide which database is used)
import 'reflect-metadata';
import { emailSchema } from '@matjari/shared';
import { AppDataSource } from '../config/data-source';
import { db } from '../config/env';
import { createDatabaseIfMissing } from './create-db';
import { ensureAdmin, ensureDemoSettings } from './demo-refresh';
import { seedDemo } from './seed-demo';
import { seedSample, SAMPLE_EMAIL, SAMPLE_PASSWORD } from './seed-sample';

function flag(name: string): string | undefined {
  const args = process.argv.slice(2);
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

async function main() {
  const adminEmail = emailSchema.parse(flag('--admin-email') ?? 'admin@matjari.app');
  const adminPassword = flag('--admin-password') ?? 'admin12345';
  if (adminPassword.length < 8) throw new Error('--admin-password must be at least 8 characters');

  console.log(`\n🗄️  Database: ${db.database} on ${db.host}${db.ssl ? ' (TLS)' : ''}`);

  await createDatabaseIfMissing();
  await AppDataSource.initialize();
  await AppDataSource.query('CREATE EXTENSION IF NOT EXISTS citext');
  await AppDataSource.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  const applied = await AppDataSource.runMigrations({ transaction: 'all' });
  console.log(`✅ Migrations: ${applied.length ? applied.map((m) => m.name).join(', ') : 'already up to date'}`);

  await ensureDemoSettings(true);
  await seedDemo();
  await seedSample();
  await ensureAdmin(adminEmail, adminPassword, true);

  console.log('\n🎉 Ready');
  console.log(`   Admin:    ${adminEmail} / ${adminPassword}`);
  console.log(`   Merchant: ${SAMPLE_EMAIL} / ${SAMPLE_PASSWORD}`);
  console.log('   Stores:   /s/demo   /s/yasmine\n');
}

main()
  .then(async () => {
    if (AppDataSource.isInitialized) await AppDataSource.destroy();
  })
  .catch(async (err: unknown) => {
    console.error('bootstrap:demo failed:', err instanceof Error ? err.message : err);
    if (AppDataSource.isInitialized) await AppDataSource.destroy();
    process.exit(1);
  });
