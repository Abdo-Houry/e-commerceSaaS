// Deletes ALL data (users, stores, products, orders, payments) and uploaded files — platform settings are kept —
// keeping the schema, then re-creates the showcase store at /s/demo. Development only.
// Usage:  npm run db:reset -- --yes
import 'reflect-metadata';
import fs from 'node:fs/promises';
import { AppDataSource } from '../config/data-source';
import { env, isProd, uploadRoot } from '../config/env';
import { seedDemo } from './seed-demo';

async function main() {
  if (isProd) {
    console.error('❌ مرفوض في بيئة الإنتاج.');
    process.exit(1);
  }
  if (!process.argv.includes('--yes')) {
    console.error(`⚠️  هذا الأمر يحذف كل البيانات من قاعدة "${env.DB_NAME}". للتأكيد:  npm run db:reset -- --yes`);
    process.exit(1);
  }

  await AppDataSource.initialize();
  try {
    // Platform settings (plans, prices, payment methods) are configuration, not test data: keep them.
    const tables = AppDataSource.entityMetadatas
      .filter((m) => m.tableName !== 'platform_settings')
      .map((m) => `"${m.tableName}"`)
      .join(', ');
    await AppDataSource.query(`TRUNCATE ${tables} RESTART IDENTITY CASCADE`);
    await AppDataSource.query(`INSERT INTO "platform_settings" ("id") VALUES (1) ON CONFLICT DO NOTHING`);

    const entries = await fs.readdir(uploadRoot).catch(() => [] as string[]);
    for (const entry of entries) {
      if (entry !== '.gitkeep') await fs.rm(`${uploadRoot}/${entry}`, { recursive: true, force: true });
    }

    // The landing page links to the showcase store, so bring it back straight away.
    await seedDemo();
  } finally {
    await AppDataSource.destroy();
  }

  console.log(`✅ تم حذف كل البيانات من "${env.DB_NAME}" وكل الصور المرفوعة.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
