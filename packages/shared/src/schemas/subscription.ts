import { z } from 'zod';
import { isValidPhone, normalizePhone } from '../utils/phone';
import { imageUrlSchema, moneySchema, optionalText, paginationSchema, requiredText } from './common';

/* ─── Access state ───────────────────────────────────────────────────── */

/**
 * trial     — inside the free trial
 * active    — paid period running
 * grace     — period ended, still working for `graceDays` with a warning
 * expired   — grace over: storefront hidden, dashboard locked to the subscription page
 * suspended — stopped by a platform admin (e.g. policy violation)
 */
export const ACCESS_STATES = ['trial', 'active', 'grace', 'expired', 'suspended'] as const;
export type AccessState = (typeof ACCESS_STATES)[number];

export const ACCESS_STATE_LABELS: Record<AccessState, string> = {
  trial: 'تجربة مجانية',
  active: 'مشترك',
  grace: 'فترة سماح',
  expired: 'منتهي',
  suspended: 'موقوف',
};

export interface AccessInfo {
  state: AccessState;
  /** End of the trial or the paid period. */
  endsAt: string | null;
  /** When the store stops working if nobody pays. */
  graceEndsAt: string | null;
  /** Whole days until the store stops working (0 when expired). */
  daysLeft: number;
  suspensionReason: string | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export interface AccessInput {
  plan: 'trial' | 'basic' | 'pro';
  trialEndsAt: Date | string | null;
  currentPeriodEnd: Date | string | null;
  suspendedAt?: Date | string | null;
  suspensionReason?: string | null;
}

/** Single source of truth for whether a store may operate. Pure, so it's unit-tested and shared. */
export function computeAccess(sub: AccessInput | null, graceDays: number, now: Date = new Date()): AccessInfo {
  if (sub?.suspendedAt) {
    return { state: 'suspended', endsAt: null, graceEndsAt: null, daysLeft: 0, suspensionReason: sub.suspensionReason ?? null };
  }
  const endRaw = sub ? (sub.plan === 'trial' ? sub.trialEndsAt : sub.currentPeriodEnd) : null;
  if (!endRaw) {
    return { state: 'expired', endsAt: null, graceEndsAt: null, daysLeft: 0, suspensionReason: null };
  }
  const endsAt = new Date(endRaw);
  const graceEndsAt = new Date(endsAt.getTime() + graceDays * DAY_MS);
  const base = { endsAt: endsAt.toISOString(), graceEndsAt: graceEndsAt.toISOString(), suspensionReason: null };

  if (now <= endsAt) {
    return { ...base, state: sub!.plan === 'trial' ? 'trial' : 'active', daysLeft: Math.ceil((graceEndsAt.getTime() - now.getTime()) / DAY_MS) };
  }
  if (now <= graceEndsAt) {
    return { ...base, state: 'grace', daysLeft: Math.max(1, Math.ceil((graceEndsAt.getTime() - now.getTime()) / DAY_MS)) };
  }
  return { ...base, state: 'expired', daysLeft: 0 };
}

export function canOperate(state: AccessState): boolean {
  return state === 'trial' || state === 'active' || state === 'grace';
}

/**
 * A new paid period starts when the current one (trial or paid) ends, if that's
 * still in the future — paying early never loses days. Otherwise it starts now.
 */
export function nextPeriodEnd(currentEnd: Date | string | null, months: number, now: Date = new Date()): Date {
  const current = currentEnd ? new Date(currentEnd) : null;
  const start = current && current > now ? current : now;
  const end = new Date(start);
  end.setMonth(end.getMonth() + months);
  return end;
}

/* ─── Plans & platform settings (edited by the admin) ────────────────── */

/** Plans are fixed durations; the admin sets each price and can switch plans off. */
export const PLAN_IDS = ['monthly', 'semiannual', 'annual'] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export const PLAN_DEFS: Record<PlanId, { name: string; months: number }> = {
  monthly: { name: 'شهري', months: 1 },
  semiannual: { name: '6 أشهر', months: 6 },
  annual: { name: 'سنوي', months: 12 },
};

export interface PlanDto {
  id: PlanId;
  name: string;
  months: number;
  /** Integer minor units of the platform currency. */
  price: number;
  /** Price per month, rounded down to a minor unit. */
  monthlyEquivalent: number;
  /** Saving versus paying the monthly plan for the same period (0 when none). */
  savingsPercent: number;
}

/** Builds the enabled plans with per-month price and savings against the monthly plan. */
export function buildPlans(plans: Partial<Record<PlanId, { enabled: boolean; price: number }>>): PlanDto[] {
  const monthly = plans.monthly?.enabled ? plans.monthly.price : 0;
  return PLAN_IDS.filter((id) => plans[id]?.enabled).map((id) => {
    const { months, name } = PLAN_DEFS[id];
    const price = plans[id]!.price;
    const full = monthly * months;
    return {
      id,
      name,
      months,
      price,
      monthlyEquivalent: Math.floor(price / months),
      savingsPercent: monthly > 0 && months > 1 && full > price ? Math.round((1 - price / full) * 100) : 0,
    };
  });
}

export const PAYMENT_METHODS = ['sham_cash', 'usdt', 'cash', 'syriatel_cash', 'mtn_cash', 'transfer'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  sham_cash: 'شام كاش',
  usdt: 'USDT (عملة رقمية)',
  cash: 'تسليم باليد',
  syriatel_cash: 'سيريتل كاش',
  mtn_cash: 'MTN كاش',
  transfer: 'حوالة (الهرم، الفؤاد…)',
};

const paymentMethodConfig = z.object({
  enabled: z.boolean(),
  /** Account code, wallet address, or handover instructions shown to merchants. */
  details: z.string().trim().max(400, 'الحد الأقصى 400 حرف'),
});

const planConfig = z.object({
  enabled: z.boolean(),
  price: moneySchema,
});

export const platformSettingsSchema = z
  .object({
    currency: z.enum(['USD', 'SYP']),
    plans: z.object({ monthly: planConfig, semiannual: planConfig, annual: planConfig }),
    trialDays: z.number({ error: 'أدخل رقماً' }).int().min(0, 'لا يمكن أن يكون سالباً').max(90, 'الحد الأقصى 90 يوماً'),
    graceDays: z.number({ error: 'أدخل رقماً' }).int().min(0, 'لا يمكن أن يكون سالباً').max(30, 'الحد الأقصى 30 يوماً'),
    supportWhatsapp: z
      .string()
      .trim()
      .max(25)
      .transform((v) => (v ? normalizePhone(v) : ''))
      .refine((v) => v === '' || isValidPhone(v), 'رقم واتساب غير صالح'),
    paymentMethods: z.object({
      sham_cash: paymentMethodConfig,
      usdt: paymentMethodConfig,
      cash: paymentMethodConfig,
      syriatel_cash: paymentMethodConfig,
      mtn_cash: paymentMethodConfig,
      transfer: paymentMethodConfig,
    }),
  })
  .refine((s) => PLAN_IDS.some((id) => s.plans[id].enabled), { message: 'فعّل باقة واحدة على الأقل', path: ['plans'] });
export type PlatformSettingsInput = z.input<typeof platformSettingsSchema>;
export type PlatformSettings = z.output<typeof platformSettingsSchema>;

/** What anyone may see (landing page pricing). */
export interface PublicPlatformInfo {
  currency: string;
  trialDays: number;
  plans: PlanDto[];
}

/* ─── Subscription requests (merchant pays, admin approves) ──────────── */

export const REQUEST_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  pending: 'قيد المراجعة',
  approved: 'تمت الموافقة',
  rejected: 'مرفوض',
};

export const subscriptionRequestSchema = z.object({
  planId: z.enum(PLAN_IDS, 'اختر الباقة'),
  method: z.enum(PAYMENT_METHODS, 'اختر طريقة الدفع'),
  reference: optionalText(200),
  receiptUrl: imageUrlSchema.nullish().transform((v) => v ?? null),
  note: optionalText(300),
});
export type SubscriptionRequestInput = z.input<typeof subscriptionRequestSchema>;

export interface SubscriptionRequestDto {
  id: string;
  planId: PlanId;
  planName: string;
  months: number;
  amount: number;
  currency: string;
  method: PaymentMethod;
  reference: string | null;
  receiptUrl: string | null;
  note: string | null;
  status: RequestStatus;
  rejectionReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
  /** Admin only. */
  store?: { id: string; name: string; slug: string; whatsappNumber: string; ownerEmail: string };
}

/* ─── Merchant view ──────────────────────────────────────────────────── */

export interface SubscriptionPaymentDto {
  id: string;
  planId: PlanId | null;
  months: number;
  amount: number;
  currency: string;
  method: PaymentMethod | 'other';
  note: string | null;
  periodEnd: string;
  createdAt: string;
  /** Admin only. */
  storeName?: string;
  storeSlug?: string;
  storeId?: string;
  adminName?: string;
}

export interface MySubscriptionDto {
  access: AccessInfo;
  plan: 'trial' | 'basic' | 'pro';
  currency: string;
  plans: PlanDto[];
  supportWhatsapp: string;
  paymentMethods: { method: PaymentMethod; label: string; details: string }[];
  requests: SubscriptionRequestDto[];
  payments: SubscriptionPaymentDto[];
}

/* ─── Admin actions ──────────────────────────────────────────────────── */

export const activateSubscriptionSchema = z.object({
  planId: z.enum(PLAN_IDS).nullish().transform((v) => v ?? null),
  months: z.number().int().min(1, 'شهر واحد على الأقل').max(36, 'الحد الأقصى 36 شهراً'),
  amount: moneySchema,
  method: z.enum([...PAYMENT_METHODS, 'other'], 'اختر طريقة الدفع'),
  note: optionalText(300),
});
export type ActivateSubscriptionInput = z.input<typeof activateSubscriptionSchema>;

export const rejectRequestSchema = z.object({
  reason: requiredText(300, 'سبب الرفض'),
});

export const requestListQuerySchema = paginationSchema.extend({
  status: z.enum(REQUEST_STATUSES).optional(),
});

export const extendTrialSchema = z.object({
  days: z.number().int().min(1, 'يوم واحد على الأقل').max(90, 'الحد الأقصى 90 يوماً'),
});

export const suspendStoreSchema = z.object({
  reason: requiredText(300, 'السبب'),
});

export const adminStoreListQuerySchema = paginationSchema.extend({
  search: z.string().trim().max(100).optional(),
  state: z.enum(ACCESS_STATES).optional(),
});
export interface AdminStoreListQuery {
  page?: number;
  limit?: number;
  search?: string;
  state?: AccessState;
}

export interface AdminStoreSummaryDto {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  city: string | null;
  owner: { id: string; name: string; email: string };
  whatsappNumber: string;
  access: AccessInfo;
  productCount: number;
  orderCount: number;
  createdAt: string;
}

export interface AdminStoreDetailDto extends AdminStoreSummaryDto {
  plan: 'trial' | 'basic' | 'pro';
  isActive: boolean;
  currency: string;
  deliveredRevenue: number;
  lastOrderAt: string | null;
  payments: SubscriptionPaymentDto[];
}

export interface AdminOverviewDto {
  stores: Record<AccessState, number> & { total: number; newLast30Days: number };
  merchants: number;
  orders: { total: number; last30Days: number };
  subscriptionRevenue: { thisMonth: number; last30Days: number; currency: string };
  /** Stores that will stop within 3 days, soonest first. */
  endingSoon: AdminStoreSummaryDto[];
  pendingRequests: number;
}
