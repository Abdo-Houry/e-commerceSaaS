// Keeps the public demo self-healing. Free hosting tiers give the API an ephemeral disk:
// the database survives a restart but uploaded images don't, and there is no shell to run
// seeds from. With DEMO_MODE on, the server configures the platform, creates the demo
// admin and re-seeds the showcase data whenever it finds them missing on boot.
import fs from 'node:fs/promises';
import path from 'node:path';
import bcrypt from 'bcrypt';
import { DEMO_STORE_SLUG, PLAN_IDS, platformSettingsSchema } from '@matjari/shared';
import { AppDataSource } from '../config/data-source';
import { env, uploadRoot } from '../config/env';
import { PlatformSettings } from '../entities/PlatformSettings';
import { Store } from '../entities/Store';
import { User } from '../entities/User';
import { clearSettingsCache } from '../services/platform.service';
import { seedDemo } from './seed-demo';
import { seedSample, SAMPLE_SLUG } from './seed-sample';

/**
 * Plan prices are integer minor units (cents): $10 / $55 / $100.
 * The payment details are deliberately placeholders — a public demo must not carry real ones.
 */
export const DEMO_SETTINGS = platformSettingsSchema.parse({
  currency: 'USD',
  plans: {
    monthly: { enabled: true, price: 1_000 },
    semiannual: { enabled: true, price: 5_500 },
    annual: { enabled: true, price: 10_000 },
  },
  trialDays: 14,
  graceDays: 3,
  supportWhatsapp: '963900000000',
  paymentMethods: {
    sham_cash: { enabled: true, details: 'كود المحفظة (تجريبي للعرض فقط):\nDEMO-SHAM-CASH-0000' },
    usdt: { enabled: true, details: 'شبكة TRC20 — عنوان تجريبي للعرض فقط:\nTDEMO00000000000000000000000000000' },
    cash: { enabled: true, details: 'تسليم نقدي باليد بعد التنسيق عبر واتساب (تجريبي).' },
    syriatel_cash: { enabled: false, details: '' },
    mtn_cash: { enabled: false, details: '' },
    transfer: { enabled: false, details: '' },
  },
});

/** Writes the demo plans and payment details — only while nothing has been configured yet. */
export async function ensureDemoSettings(force = false): Promise<void> {
  const repo = AppDataSource.getRepository(PlatformSettings);
  const row = await repo.findOne({ where: { id: 1 } });
  if (!force && row && PLAN_IDS.some((id) => row.plans?.[id]?.enabled)) return;
  await repo.save(repo.create({ id: 1, ...DEMO_SETTINGS }));
  clearSettingsCache();
  console.log('Platform settings: 3 plans, placeholder payment details');
}

/**
 * Creates the admin account if it is missing.
 * `resetPassword` also rewrites an existing account's password (the CLI bootstrap does).
 * `soleAdmin` demotes every other admin, so a public demo has exactly one documented login.
 */
export async function ensureAdmin(
  email: string,
  password: string,
  { resetPassword = false, soleAdmin = false }: { resetPassword?: boolean; soleAdmin?: boolean } = {},
): Promise<void> {
  if (!email || !password) return;
  const repo = AppDataSource.getRepository(User);

  if (soleAdmin) {
    const { affected } = await repo
      .createQueryBuilder()
      .update()
      .set({ role: 'merchant' })
      .where('role = :role', { role: 'admin' })
      .andWhere('email != :email', { email })
      .execute();
    if (affected) console.log(`Demoted ${affected} undocumented admin account(s).`);
  }

  const existing = await repo.findOne({ where: { email } });
  const passwordHash = await bcrypt.hash(password, 12);
  if (!existing) {
    await repo.save(repo.create({ name: 'مدير المنصة', email, passwordHash, role: 'admin' }));
    console.log(`Admin account created: ${email}`);
  } else if (resetPassword || existing.role !== 'admin') {
    await repo.update(existing.id, { role: 'admin', ...(resetPassword ? { passwordHash } : {}) });
    console.log(`Admin account updated: ${email}`);
  }
}

async function exists(file: string): Promise<boolean> {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

/** `/uploads/<store>/<file>` → its location on disk. */
function toDiskPath(url: string): string {
  return path.join(uploadRoot, url.replace(/^\/uploads\//, ''));
}

/** Re-seeds the showcase store and the sample merchant when their images are gone (or never existed). */
export async function seedDemoDataIfMissing(): Promise<void> {
  const store = await AppDataSource.getRepository(Store).findOne({ where: { slug: DEMO_STORE_SLUG } });
  if (store?.logoUrl && (await exists(toDiskPath(store.logoUrl)))) return;

  console.log('Demo images missing — re-seeding the showcase store and the sample merchant…');
  await seedDemo();
  await seedSample();
  console.log('Demo data restored.');
}

/** The demo's admin panel is open to visitors, so undo anything they suspended. */
async function unsuspendDemoStores(): Promise<void> {
  const { affected } = await AppDataSource.getRepository(Store)
    .createQueryBuilder()
    .update()
    .set({ suspendedAt: null, suspensionReason: null })
    .where('slug IN (:...slugs)', { slugs: [DEMO_STORE_SLUG, SAMPLE_SLUG] })
    .andWhere('"suspendedAt" IS NOT NULL')
    .execute();
  if (affected) console.log('Demo stores un-suspended.');
}

/** Everything the public demo instance needs, run after the server starts listening. */
export async function refreshDemoData(): Promise<void> {
  await ensureDemoSettings();
  await ensureAdmin(env.DEMO_ADMIN_EMAIL, env.DEMO_ADMIN_PASSWORD, { soleAdmin: true });
  await seedDemoDataIfMissing();
  await unsuspendDemoStores();
}
