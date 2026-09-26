import {
  buildPlans,
  computeAccess,
  PAYMENT_METHODS,
  PLAN_IDS,
  type PlanDto,
  type AccessInfo,
  type PlatformSettings as PlatformSettingsDto,
  type PublicPlatformInfo,
} from '@matjari/shared';
import type { EntityManager } from 'typeorm';
import { AppDataSource } from '../config/data-source';
import { PlatformSettings } from '../entities/PlatformSettings';
import { Store } from '../entities/Store';
import { Subscription } from '../entities/Subscription';
import { revalidatePlatform } from '../utils/revalidate';

const CACHE_MS = 30_000;
let cache: { value: PlatformSettings; at: number } | null = null;

/** The settings row, created with defaults on first use. Cached briefly: it's read on every merchant request. */
export async function getSettings(manager: EntityManager = AppDataSource.manager): Promise<PlatformSettings> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value;
  const repo = manager.getRepository(PlatformSettings);
  let row = await repo.findOne({ where: { id: 1 } });
  if (!row) {
    await repo.createQueryBuilder().insert().values({ id: 1 }).orIgnore().execute();
    row = await repo.findOneOrFail({ where: { id: 1 } });
  }
  cache = { value: row, at: Date.now() };
  return row;
}

export function clearSettingsCache() {
  cache = null;
}

export function toSettingsDto(s: PlatformSettings): PlatformSettingsDto {
  return {
    currency: s.currency === 'SYP' ? 'SYP' : 'USD',
    plans: Object.fromEntries(
      PLAN_IDS.map((id) => [id, { enabled: s.plans?.[id]?.enabled ?? false, price: s.plans?.[id]?.price ?? 0 }]),
    ) as PlatformSettingsDto['plans'],
    trialDays: s.trialDays,
    graceDays: s.graceDays,
    supportWhatsapp: s.supportWhatsapp,
    paymentMethods: Object.fromEntries(
      PAYMENT_METHODS.map((m) => [m, { enabled: s.paymentMethods?.[m]?.enabled ?? false, details: s.paymentMethods?.[m]?.details ?? '' }]),
    ) as PlatformSettingsDto['paymentMethods'],
  };
}

export async function updateSettings(input: PlatformSettingsDto): Promise<PlatformSettingsDto> {
  const row = await getSettings();
  Object.assign(row, input);
  await AppDataSource.getRepository(PlatformSettings).save(row);
  clearSettingsCache();
  revalidatePlatform();
  return toSettingsDto(row);
}

export function enabledPlans(s: PlatformSettings): PlanDto[] {
  return buildPlans(s.plans ?? {});
}

export async function getPublicPlatformInfo(): Promise<PublicPlatformInfo> {
  const s = await getSettings();
  return { currency: s.currency, trialDays: s.trialDays, plans: enabledPlans(s) };
}

export function accessFor(store: Pick<Store, 'suspendedAt' | 'suspensionReason'>, sub: Subscription | null | undefined, graceDays: number): AccessInfo {
  return computeAccess(
    sub ? { plan: sub.plan, trialEndsAt: sub.trialEndsAt, currentPeriodEnd: sub.currentPeriodEnd, suspendedAt: store.suspendedAt, suspensionReason: store.suspensionReason } : null,
    graceDays,
  );
}

/** Access state for a store, straight from the database. */
export async function getStoreAccess(storeId: string): Promise<AccessInfo> {
  const [settings, store, sub] = await Promise.all([
    getSettings(),
    AppDataSource.getRepository(Store).findOne({ where: { id: storeId }, select: { id: true, suspendedAt: true, suspensionReason: true } }),
    AppDataSource.getRepository(Subscription).findOne({ where: { storeId } }),
  ]);
  if (!store) return computeAccess(null, settings.graceDays);
  return accessFor(store, sub, settings.graceDays);
}
