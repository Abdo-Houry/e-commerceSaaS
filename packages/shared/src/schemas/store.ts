import { z } from 'zod';
import {
  DEFAULT_PRIMARY_COLOR,
  DEFAULT_SECONDARY_COLOR,
  STORE_FONTS,
  STORE_TEMPLATES,
  type StoreFont,
  type StoreTemplate,
  type SubscriptionPlan,
  type SubscriptionStatus,
} from '../constants';
import { HEX_COLOR_RE } from '../utils/color';
import { CURRENCY_CODES } from '../utils/money';
import { isValidPhone, normalizePhone } from '../utils/phone';
import { isReservedSlug, SLUG_RE } from '../utils/slug';
import { imageUrlSchema, moneySchema, optionalText, requiredText } from './common';

export const slugSchema = z
  .string({ error: 'رابط المتجر مطلوب' })
  .trim()
  .toLowerCase()
  .min(3, 'الرابط يجب أن يكون 3 أحرف على الأقل')
  .max(40, 'الرابط يجب ألا يتجاوز 40 حرفاً')
  .regex(SLUG_RE, 'استخدم أحرفاً إنجليزية صغيرة وأرقاماً وشرطات فقط')
  .refine((s) => !isReservedSlug(s), 'هذا الرابط محجوز، اختر رابطاً آخر');

export const phoneSchema = z
  .string({ error: 'رقم الهاتف مطلوب' })
  .trim()
  .min(1, 'رقم الهاتف مطلوب')
  .max(25, 'رقم الهاتف طويل جداً')
  .transform((v) => normalizePhone(v))
  .refine(isValidPhone, 'رقم الهاتف غير صالح');

export const hexColorSchema = z.string().regex(HEX_COLOR_RE, 'لون غير صالح').transform((v) => v.toUpperCase());

export const socialLinksSchema = z.object({
  instagram: z.string().trim().max(200).optional().default(''),
  facebook: z.string().trim().max(200).optional().default(''),
  tiktok: z.string().trim().max(200).optional().default(''),
});
export type SocialLinks = z.infer<typeof socialLinksSchema>;

export const businessHoursSchema = z.object({
  summary: z.string().trim().max(120).optional().default(''),
});
export type BusinessHours = z.infer<typeof businessHoursSchema>;

export const createStoreSchema = z.object({
  name: requiredText(60, 'اسم المتجر'),
  slug: slugSchema,
  whatsappNumber: phoneSchema,
  city: optionalText(60),
  currency: z.enum(CURRENCY_CODES).default('SYP'),
  logoUrl: imageUrlSchema.nullish(),
  primaryColor: hexColorSchema.default(DEFAULT_PRIMARY_COLOR),
  secondaryColor: hexColorSchema.default(DEFAULT_SECONDARY_COLOR),
  template: z.enum(STORE_TEMPLATES).default('classic'),
});
export type CreateStoreInput = z.input<typeof createStoreSchema>;

export const updateStoreSchema = z
  .object({
    name: requiredText(60, 'اسم المتجر'),
    slug: slugSchema,
    description: optionalText(500),
    logoUrl: imageUrlSchema.nullable(),
    faviconUrl: imageUrlSchema.nullable(),
    bannerUrl: imageUrlSchema.nullable(),
    bannerTitle: optionalText(80),
    bannerSubtitle: optionalText(160),
    template: z.enum(STORE_TEMPLATES),
    primaryColor: hexColorSchema,
    secondaryColor: hexColorSchema,
    font: z.enum(STORE_FONTS),
    whatsappNumber: phoneSchema,
    currency: z.enum(CURRENCY_CODES),
    city: optionalText(60),
    socialLinks: socialLinksSchema,
    businessHours: businessHoursSchema,
    minOrderAmount: moneySchema,
    isActive: z.boolean(),
  })
  .partial();
export type UpdateStoreInput = z.input<typeof updateStoreSchema>;

export const slugAvailableQuerySchema = z.object({ slug: z.string().max(60) });

export interface SlugAvailability {
  slug: string;
  available: boolean;
  reason?: string;
}

export interface SubscriptionDto {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
}

export interface StoreDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  bannerUrl: string | null;
  bannerTitle: string | null;
  bannerSubtitle: string | null;
  template: StoreTemplate;
  primaryColor: string;
  secondaryColor: string;
  font: StoreFont;
  whatsappNumber: string;
  currency: string;
  city: string | null;
  socialLinks: SocialLinks;
  businessHours: BusinessHours;
  minOrderAmount: number;
  isActive: boolean;
  createdAt: string;
  subscription: SubscriptionDto | null;
}

export interface StoreQr {
  url: string;
  dataUrl: string;
}
