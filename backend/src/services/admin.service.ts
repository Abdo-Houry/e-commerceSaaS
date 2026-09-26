import {
  ACCESS_STATES,
  nextPeriodEnd,
  type AccessState,
  type activateSubscriptionSchema,
  type AdminOverviewDto,
  type AdminStoreDetailDto,
  type AdminStoreSummaryDto,
  type adminStoreListQuerySchema,
  type Paginated,
  type requestListQuerySchema,
  type SubscriptionPaymentDto,
  type SubscriptionRequestDto,
  DEMO_STORE_SLUG,
} from '@matjari/shared';
import type { EntityManager } from 'typeorm';
import type { z } from 'zod';
import { AppDataSource } from '../config/data-source';
import { env } from '../config/env';
import { Store } from '../entities/Store';
import { Subscription } from '../entities/Subscription';
import { SubscriptionPayment } from '../entities/SubscriptionPayment';
import { SubscriptionRequest } from '../entities/SubscriptionRequest';
import { User } from '../entities/User';
import { HttpError } from '../utils/http-error';
import { revalidateStorefront } from '../utils/revalidate';
import { accessFor, getSettings } from './platform.service';
import { toPaymentDto, toRequestDto } from './subscription.service';

type ListQuery = z.output<typeof adminStoreListQuerySchema>;
type ActivateInput = z.output<typeof activateSubscriptionSchema>;
type RequestListQuery = z.output<typeof requestListQuerySchema>;

// The showcase store is platform content, not a customer: keep it out of admin lists and counts.
const NOT_DEMO = `s.slug <> '${DEMO_STORE_SLUG}'`;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * SQL mirror of computeAccess() so lists can be filtered and counted in the
 * database. `grace` is the SQL placeholder holding the grace days.
 */
const stateSql = (grace: string) => `
  CASE
    WHEN s."suspendedAt" IS NOT NULL THEN 'suspended'
    WHEN sub.plan = 'trial' AND sub."trialEndsAt" >= now() THEN 'trial'
    WHEN sub.plan <> 'trial' AND sub."currentPeriodEnd" >= now() THEN 'active'
    WHEN (CASE WHEN sub.plan = 'trial' THEN sub."trialEndsAt" ELSE sub."currentPeriodEnd" END)
         + make_interval(days => ${grace}::int) >= now() THEN 'grace'
    ELSE 'expired'
  END`;

const BASE_FROM = `
  FROM stores s
  JOIN users u ON u.id = s."ownerId"
  LEFT JOIN subscriptions sub ON sub."storeId" = s.id`;

interface StoreRow {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  city: string | null;
  whatsappNumber: string;
  createdAt: Date;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  productCount: string;
  orderCount: string;
}

async function loadSummaries(rows: StoreRow[], graceDays: number): Promise<AdminStoreSummaryDto[]> {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const [stores, subs] = await Promise.all([
    AppDataSource.getRepository(Store)
      .createQueryBuilder('s')
      .select(['s.id', 's.suspendedAt', 's.suspensionReason'])
      .where('s.id IN (:...ids)', { ids })
      .getMany(),
    AppDataSource.getRepository(Subscription).createQueryBuilder('sub').where('sub.storeId IN (:...ids)', { ids }).getMany(),
  ]);
  const storeById = new Map(stores.map((s) => [s.id, s]));
  const subByStore = new Map(subs.map((s) => [s.storeId, s]));

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    logoUrl: r.logoUrl,
    city: r.city,
    whatsappNumber: r.whatsappNumber,
    owner: { id: r.ownerId, name: r.ownerName, email: r.ownerEmail },
    access: accessFor(storeById.get(r.id)!, subByStore.get(r.id), graceDays),
    productCount: Number(r.productCount),
    orderCount: Number(r.orderCount),
    createdAt: new Date(r.createdAt).toISOString(),
  }));
}

const SUMMARY_SELECT = `
  SELECT s.id, s.name, s.slug, s."logoUrl", s.city, s."whatsappNumber", s."createdAt",
         u.id AS "ownerId", u.name AS "ownerName", u.email AS "ownerEmail",
         (SELECT COUNT(*) FROM products p WHERE p."storeId" = s.id AND p."deletedAt" IS NULL) AS "productCount",
         (SELECT COUNT(*) FROM orders o WHERE o."storeId" = s.id) AS "orderCount"`;

export async function listStores(q: ListQuery): Promise<Paginated<AdminStoreSummaryDto>> {
  const { graceDays } = await getSettings();
  const params: unknown[] = [];
  const where: string[] = [NOT_DEMO];
  if (q.search) {
    params.push(`%${q.search.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
    const i = params.length;
    where.push(`(s.name ILIKE $${i} OR s.slug ILIKE $${i} OR u.email::text ILIKE $${i} OR u.name ILIKE $${i} OR s."whatsappNumber" LIKE $${i})`);
  }
  if (q.state) {
    params.push(graceDays, q.state);
    where.push(`(${stateSql(`$${params.length - 1}`)}) = $${params.length}`);
  }
  const whereSql = `WHERE ${where.join(' AND ')}`;

  const [{ count }] = await AppDataSource.query(`SELECT COUNT(*) AS count ${BASE_FROM} ${whereSql}`, params);
  const rows: StoreRow[] = await AppDataSource.query(
    `${SUMMARY_SELECT} ${BASE_FROM} ${whereSql} ORDER BY s."createdAt" DESC LIMIT ${q.limit} OFFSET ${(q.page - 1) * q.limit}`,
    params,
  );
  const total = Number(count);
  return { items: await loadSummaries(rows, graceDays), total, page: q.page, limit: q.limit, pages: Math.ceil(total / q.limit) };
}

export async function overview(): Promise<AdminOverviewDto> {
  const settings = await getSettings();
  const g = [settings.graceDays];

  const stateRows: { state: AccessState; count: string }[] = await AppDataSource.query(
    `SELECT (${stateSql('$1')}) AS state, COUNT(*) AS count ${BASE_FROM} WHERE ${NOT_DEMO} GROUP BY 1`,
    g,
  );
  const byState = Object.fromEntries(ACCESS_STATES.map((s) => [s, 0])) as Record<AccessState, number>;
  for (const r of stateRows) byState[r.state] = Number(r.count);

  const [misc] = await AppDataSource.query(
    `SELECT
       (SELECT COUNT(*) FROM stores s WHERE ${NOT_DEMO}) AS total,
       (SELECT COUNT(*) FROM stores s WHERE ${NOT_DEMO} AND "createdAt" >= now() - interval '30 days') AS "newStores",
       (SELECT COUNT(*) FROM stores s WHERE ${NOT_DEMO}) AS merchants,
       (SELECT COUNT(*) FROM subscription_requests WHERE status = 'pending') AS "pendingRequests",
       (SELECT COUNT(*) FROM orders) AS "ordersTotal",
       (SELECT COUNT(*) FROM orders WHERE "createdAt" >= now() - interval '30 days') AS "orders30",
       (SELECT COALESCE(SUM(amount), 0) FROM subscription_payments
          WHERE date_trunc('month', "createdAt" AT TIME ZONE $1) = date_trunc('month', now() AT TIME ZONE $1)) AS "revMonth",
       (SELECT COALESCE(SUM(amount), 0) FROM subscription_payments WHERE "createdAt" >= now() - interval '30 days') AS "rev30"`,
    [env.APP_TIMEZONE],
  );

  // Operating stores whose last working day (end + grace) is within 3 days.
  const soon: StoreRow[] = await AppDataSource.query(
    `${SUMMARY_SELECT} ${BASE_FROM}
     WHERE s."suspendedAt" IS NULL AND ${NOT_DEMO}
       AND (CASE WHEN sub.plan = 'trial' THEN sub."trialEndsAt" ELSE sub."currentPeriodEnd" END) + make_interval(days => $1::int)
           BETWEEN now() AND now() + interval '3 days'
     ORDER BY (CASE WHEN sub.plan = 'trial' THEN sub."trialEndsAt" ELSE sub."currentPeriodEnd" END) ASC
     LIMIT 20`,
    g,
  );

  return {
    stores: { ...byState, total: Number(misc.total), newLast30Days: Number(misc.newStores) },
    merchants: Number(misc.merchants),
    orders: { total: Number(misc.ordersTotal), last30Days: Number(misc.orders30) },
    subscriptionRevenue: { thisMonth: Number(misc.revMonth), last30Days: Number(misc.rev30), currency: settings.currency },
    endingSoon: await loadSummaries(soon, settings.graceDays),
    pendingRequests: Number(misc.pendingRequests),
  };
}

export async function getStoreDetail(id: string): Promise<AdminStoreDetailDto> {
  const { graceDays } = await getSettings();
  const rows: StoreRow[] = await AppDataSource.query(`${SUMMARY_SELECT} ${BASE_FROM} WHERE s.id = $1`, [id]);
  if (!rows.length) throw HttpError.notFound('المتجر غير موجود');
  const [summary] = await loadSummaries(rows, graceDays);

  const [store, sub, payments, [extra]] = await Promise.all([
    AppDataSource.getRepository(Store).findOneOrFail({ where: { id } }),
    AppDataSource.getRepository(Subscription).findOne({ where: { storeId: id } }),
    listPaymentsRaw({ storeId: id, limit: 100 }),
    AppDataSource.query(
      `SELECT COALESCE(SUM(total) FILTER (WHERE status = 'delivered'), 0) AS revenue, MAX("createdAt") AS "lastOrderAt"
       FROM orders WHERE "storeId" = $1`,
      [id],
    ),
  ]);

  return {
    ...summary!,
    plan: sub?.plan ?? 'trial',
    isActive: store.isActive,
    currency: store.currency,
    deliveredRevenue: Number(extra.revenue),
    lastOrderAt: extra.lastOrderAt ? new Date(extra.lastOrderAt).toISOString() : null,
    payments,
  };
}

async function loadStoreAndSub(storeId: string) {
  const store = await AppDataSource.getRepository(Store).findOne({ where: { id: storeId } });
  if (!store) throw HttpError.notFound('المتجر غير موجود');
  return store;
}

/** Extends the paid period and records the payment, inside the caller's transaction. */
async function applyActivation(m: EntityManager, storeId: string, adminId: string, input: ActivateInput, currency: string) {
  const sub = await m.findOne(Subscription, { where: { storeId }, lock: { mode: 'pessimistic_write' } });
  if (!sub) throw HttpError.notFound('لا يوجد اشتراك لهذا المتجر');
  // Paying early never loses remaining days: the new period starts where the current one ends.
  const currentEnd = sub.plan === 'trial' ? sub.trialEndsAt : sub.currentPeriodEnd;
  const periodEnd = nextPeriodEnd(currentEnd, input.months);

  sub.plan = 'basic';
  sub.status = 'active';
  sub.currentPeriodEnd = periodEnd;
  await m.save(sub);
  await m.save(
    m.create(SubscriptionPayment, {
      storeId,
      adminId,
      planId: input.planId,
      months: input.months,
      amount: input.amount,
      currency,
      method: input.method,
      note: input.note,
      periodEnd,
    }),
  );
}

/** Records a manual payment and extends the paid period. */
export async function activateSubscription(storeId: string, adminId: string, input: ActivateInput): Promise<AdminStoreDetailDto> {
  const store = await loadStoreAndSub(storeId);
  const { currency } = await getSettings();
  await AppDataSource.transaction((m) => applyActivation(m, storeId, adminId, input, currency));
  revalidateStorefront(store.slug);
  return getStoreDetail(storeId);
}

/* ─── Subscription requests ──────────────────────────────────────────── */

export async function listRequests(q: RequestListQuery): Promise<Paginated<SubscriptionRequestDto>> {
  const repo = AppDataSource.getRepository(SubscriptionRequest);
  const where = q.status ? { status: q.status } : {};
  const [rows, total] = await repo.findAndCount({
    where,
    relations: { store: { owner: true } },
    order: { createdAt: 'DESC' },
    skip: (q.page - 1) * q.limit,
    take: q.limit,
  });
  const items = rows.map((r) => ({
    ...toRequestDto(r),
    store: {
      id: r.storeId,
      name: r.store?.name ?? '',
      slug: r.store?.slug ?? '',
      whatsappNumber: r.store?.whatsappNumber ?? '',
      ownerEmail: r.store?.owner?.email ?? '',
    },
  }));
  return { items, total, page: q.page, limit: q.limit, pages: Math.ceil(total / q.limit) };
}

async function lockPending(m: EntityManager, id: string) {
  const request = await m.findOne(SubscriptionRequest, { where: { id }, lock: { mode: 'pessimistic_write' } });
  if (!request) throw HttpError.notFound('الطلب غير موجود');
  if (request.status !== 'pending') throw HttpError.conflict('تمت مراجعة هذا الطلب مسبقاً', 'REQUEST_REVIEWED');
  return request;
}

/** Approving activates the plan exactly as requested (amount and months frozen at request time). */
export async function approveRequest(id: string, adminId: string): Promise<SubscriptionRequestDto> {
  const result = await AppDataSource.transaction(async (m) => {
    const request = await lockPending(m, id);
    const note = ['طلب اشتراك', request.reference, request.note].filter(Boolean).join(' — ').slice(0, 300);
    await applyActivation(
      m,
      request.storeId,
      adminId,
      { planId: request.planId, months: request.months, amount: request.amount, method: request.method, note },
      request.currency,
    );
    request.status = 'approved';
    request.reviewedById = adminId;
    request.reviewedAt = new Date();
    await m.save(request);
    return request;
  });
  const store = await AppDataSource.getRepository(Store).findOne({ where: { id: result.storeId }, select: { slug: true } });
  revalidateStorefront(store?.slug);
  return toRequestDto(result);
}

export async function rejectRequest(id: string, adminId: string, reason: string): Promise<SubscriptionRequestDto> {
  const result = await AppDataSource.transaction(async (m) => {
    const request = await lockPending(m, id);
    request.status = 'rejected';
    request.rejectionReason = reason;
    request.reviewedById = adminId;
    request.reviewedAt = new Date();
    await m.save(request);
    return request;
  });
  return toRequestDto(result);
}

export async function extendTrial(storeId: string, days: number): Promise<AdminStoreDetailDto> {
  const store = await loadStoreAndSub(storeId);
  await AppDataSource.transaction(async (m) => {
    const sub = await m.findOne(Subscription, { where: { storeId }, lock: { mode: 'pessimistic_write' } });
    if (!sub) throw HttpError.notFound('لا يوجد اشتراك لهذا المتجر');
    if (sub.plan !== 'trial') throw HttpError.unprocessable('المتجر مشترك بالفعل — استخدم تفعيل الاشتراك', 'NOT_TRIAL');
    const now = Date.now();
    const from = sub.trialEndsAt && sub.trialEndsAt.getTime() > now ? sub.trialEndsAt.getTime() : now;
    sub.trialEndsAt = new Date(from + days * DAY_MS);
    await m.save(sub);
  });
  revalidateStorefront(store.slug);
  return getStoreDetail(storeId);
}

export async function suspendStore(storeId: string, reason: string): Promise<AdminStoreDetailDto> {
  const store = await loadStoreAndSub(storeId);
  await AppDataSource.getRepository(Store).update(storeId, { suspendedAt: new Date(), suspensionReason: reason });
  revalidateStorefront(store.slug);
  return getStoreDetail(storeId);
}

export async function unsuspendStore(storeId: string): Promise<AdminStoreDetailDto> {
  const store = await loadStoreAndSub(storeId);
  await AppDataSource.getRepository(Store).update(storeId, { suspendedAt: null, suspensionReason: null });
  revalidateStorefront(store.slug);
  return getStoreDetail(storeId);
}

async function listPaymentsRaw({ storeId, limit, offset = 0 }: { storeId?: string; limit: number; offset?: number }) {
  const qb = AppDataSource.getRepository(SubscriptionPayment)
    .createQueryBuilder('p')
    .leftJoin(Store, 's', 's.id = p.storeId')
    .leftJoin(User, 'a', 'a.id = p.adminId')
    .addSelect(['s.name', 's.slug', 'a.name'])
    .orderBy('p.createdAt', 'DESC')
    .take(limit)
    .skip(offset);
  if (storeId) qb.where('p.storeId = :storeId', { storeId });
  const { entities, raw } = await qb.getRawAndEntities();
  return entities.map(
    (p, i): SubscriptionPaymentDto => ({
      ...toPaymentDto(p),
      storeId: p.storeId,
      storeName: raw[i]?.s_name ?? undefined,
      storeSlug: raw[i]?.s_slug ?? undefined,
      adminName: raw[i]?.a_name ?? undefined,
    }),
  );
}

export async function listPayments(page: number, limit: number): Promise<Paginated<SubscriptionPaymentDto>> {
  const total = await AppDataSource.getRepository(SubscriptionPayment).count();
  const items = await listPaymentsRaw({ limit, offset: (page - 1) * limit });
  return { items, total, page, limit, pages: Math.ceil(total / limit) };
}
