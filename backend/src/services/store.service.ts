import QRCode from 'qrcode';
import { Not } from 'typeorm';
import {
  isReservedSlug,
  SLUG_RE,
  type createStoreSchema,
  type SlugAvailability,
  type StoreDto,
  type StoreQr,
  type updateStoreSchema,
} from '@matjari/shared';
import type { z } from 'zod';
import { AppDataSource } from '../config/data-source';
import { env } from '../config/env';
import { Store } from '../entities/Store';
import { Subscription } from '../entities/Subscription';
import { toStoreDto } from '../utils/dto';
import { HttpError } from '../utils/http-error';
import { revalidateStorefront } from '../utils/revalidate';
import { getSettings } from './platform.service';
import { assertOwnUploads } from './upload.service';

type CreateStore = z.output<typeof createStoreSchema>;
type UpdateStore = z.output<typeof updateStoreSchema>;

const stores = () => AppDataSource.getRepository(Store);

export async function checkSlug(rawSlug: string, exceptStoreId?: string): Promise<SlugAvailability> {
  const slug = rawSlug.trim().toLowerCase();
  if (slug.length < 3 || slug.length > 40) {
    return { slug, available: false, reason: 'الرابط يجب أن يكون بين 3 و40 حرفاً' };
  }
  if (!SLUG_RE.test(slug)) {
    return { slug, available: false, reason: 'استخدم أحرفاً إنجليزية صغيرة وأرقاماً وشرطات فقط' };
  }
  if (isReservedSlug(slug)) return { slug, available: false, reason: 'هذا الرابط محجوز' };

  const taken = await stores().exists({
    where: exceptStoreId ? { slug, id: Not(exceptStoreId) } : { slug },
  });
  return taken ? { slug, available: false, reason: 'هذا الرابط مستخدم من متجر آخر' } : { slug, available: true };
}

export async function createStore(userId: string, input: CreateStore): Promise<StoreDto> {
  if (await stores().exists({ where: { ownerId: userId } })) {
    throw HttpError.conflict('لديك متجر بالفعل', 'STORE_EXISTS');
  }
  if (input.logoUrl) assertOwnUploads(`users/${userId}`, [input.logoUrl]);
  const slug = await checkSlug(input.slug);
  if (!slug.available) throw HttpError.conflict(slug.reason ?? 'الرابط غير متاح', 'SLUG_TAKEN');

  const { trialDays } = await getSettings();
  return AppDataSource.transaction(async (m) => {
    const store = m.create(Store, {
      ownerId: userId,
      name: input.name,
      slug: input.slug,
      whatsappNumber: input.whatsappNumber,
      city: input.city,
      currency: input.currency,
      logoUrl: input.logoUrl ?? null,
      primaryColor: input.primaryColor,
      secondaryColor: input.secondaryColor,
      template: input.template,
      socialLinks: { instagram: '', facebook: '', tiktok: '' },
      businessHours: { summary: '' },
    });
    await m.save(store);

    const subscription = m.create(Subscription, {
      storeId: store.id,
      plan: 'trial',
      status: 'active',
      trialEndsAt: new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000),
      currentPeriodEnd: null,
    });
    await m.save(subscription);
    return toStoreDto(store, subscription);
  });
}

export async function getStore(storeId: string): Promise<StoreDto> {
  const store = await stores().findOne({ where: { id: storeId }, relations: { subscription: true } });
  if (!store) throw HttpError.notFound();
  return toStoreDto(store);
}

export async function updateStore(storeId: string, input: UpdateStore): Promise<StoreDto> {
  const store = await stores().findOne({ where: { id: storeId }, relations: { subscription: true } });
  if (!store) throw HttpError.notFound();
  const previousSlug = store.slug;

  if (input.slug && input.slug !== store.slug) {
    const slug = await checkSlug(input.slug, storeId);
    if (!slug.available) throw HttpError.conflict(slug.reason ?? 'الرابط غير متاح', 'SLUG_TAKEN');
  }
  assertOwnUploads(
    [storeId, `users/${store.ownerId}`],
    [input.logoUrl, input.faviconUrl, input.bannerUrl].filter((u): u is string => !!u),
  );

  const { socialLinks, businessHours, ...rest } = input;
  Object.assign(store, rest);
  if (socialLinks) store.socialLinks = { ...store.socialLinks, ...socialLinks };
  if (businessHours) store.businessHours = { ...store.businessHours, ...businessHours };

  const { subscription, ...toSave } = store;
  await stores().save(toSave as Store);
  revalidateStorefront(previousSlug, store.slug);
  return toStoreDto(store, subscription);
}

export function storefrontUrl(slug: string): string {
  return `${env.WEB_PUBLIC_URL}/s/${slug}`;
}

export async function getStoreQr(storeId: string): Promise<StoreQr> {
  const store = await stores().findOne({ where: { id: storeId }, select: { id: true, slug: true } });
  if (!store) throw HttpError.notFound();
  const url = storefrontUrl(store.slug);
  const dataUrl = await QRCode.toDataURL(url, {
    width: 512,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: { dark: '#1C1917', light: '#FFFFFF' },
  });
  return { url, dataUrl };
}
