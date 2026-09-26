// Turns an empty database into a complete, explorable demo: migrations, platform
// settings with placeholder payment details, the demo storefront, a sample merchant
// with orders, and an admin account.
//
// Usage: npm run bootstrap:demo -- --admin-email you@example.com --admin-password "strong-password"
//        (DATABASE_URL or the DB_* variables decide which database is used)
import 'reflect-metadata';
import bcrypt from 'bcrypt';
import { emailSchema, platformSettingsSchema } from '@matjari/shared';
import { AppDataSource } from '../config/data-source';
import { db } from '../config/env';
import { PlatformSettings } from '../entities/PlatformSettings';
import { User } from '../entities/User';
import { createDatabaseIfMissing } from './create-db';
import { seedDemo } from './seed-demo';
import { seedSample, SAMPLE_EMAIL, SAMPLE_PASSWORD } from './seed-sample';

/** Prices are integer minor units (cents): $10 / $55 / $100. */
const SETTINGS = platformSettingsSchema.parse({
  currency: 'USD',
  plans: {
    monthly: { enabled: true, price: 1_000 },
    semiannual: { enabled: true, price: 5_500 },
    annual: { enabled: true, price: 10_000 },
  },
  trialDays: 14,
  graceDays: 3,
  // Placeholders on purpose: a public demo should never carry real payment details.
  supportWhatsapp: '963900000000',
  paymentMethods: {
    sham_cash: { enabled: true, details: 'كود المحفظة (تجريبي للعرض فقط):\nDEMO-SHAM-CASH-0000' },
    usdt: { enabled: true, details: 'شبكة TRC20 — عنوان تجريبي للعرض فقط:\nTDEMOxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
    cash: { enabled: true, details: 'تسليم نقدي باليد بعد التنسيق عبر واتساب (تجريبي).' },
    syriatel_cash: { enabled: false, details: '' },
    mtn_cash: { enabled: false, details: '' },
    transfer: { enabled: false, details: '' },
  },
});

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

  const settings = AppDataSource.getRepository(PlatformSettings);
  await settings.save(settings.create({ id: 1, ...SETTINGS }));
  console.log('✅ Platform settings: 3 plans, placeholder payment details');

  await seedDemo();
  await seedSample();

  const users = AppDataSource.getRepository(User);
  const passwordHash = await bcrypt.hash(adminPassword, 12);
  const existing = await users.findOne({ where: { email: adminEmail } });
  if (existing) await users.update(existing.id, { role: 'admin', passwordHash });
  else await users.save(users.create({ name: 'مدير المنصة', email: adminEmail, passwordHash, role: 'admin' }));

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
