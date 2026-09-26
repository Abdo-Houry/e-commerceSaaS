import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  PLAN_DEFS,
  type MySubscriptionDto,
  type SubscriptionPaymentDto,
  type SubscriptionRequestDto,
  type subscriptionRequestSchema,
} from '@matjari/shared';
import type { z } from 'zod';
import { AppDataSource } from '../config/data-source';
import { Subscription } from '../entities/Subscription';
import { SubscriptionPayment } from '../entities/SubscriptionPayment';
import { SubscriptionRequest } from '../entities/SubscriptionRequest';
import { HttpError } from '../utils/http-error';
import { enabledPlans, getSettings, getStoreAccess } from './platform.service';
import { assertOwnUploads } from './upload.service';

type RequestInput = z.output<typeof subscriptionRequestSchema>;

export function toPaymentDto(p: SubscriptionPayment): SubscriptionPaymentDto {
  return {
    id: p.id,
    planId: p.planId,
    months: p.months,
    amount: p.amount,
    currency: p.currency,
    method: p.method,
    note: p.note,
    periodEnd: p.periodEnd.toISOString(),
    createdAt: p.createdAt.toISOString(),
  };
}

export function toRequestDto(r: SubscriptionRequest): SubscriptionRequestDto {
  return {
    id: r.id,
    planId: r.planId,
    planName: PLAN_DEFS[r.planId]?.name ?? r.planId,
    months: r.months,
    amount: r.amount,
    currency: r.currency,
    method: r.method,
    reference: r.reference,
    receiptUrl: r.receiptUrl,
    note: r.note,
    status: r.status,
    rejectionReason: r.rejectionReason,
    createdAt: r.createdAt.toISOString(),
    reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
  };
}

/** Everything a merchant needs to see their status, choose a plan and pay. */
export async function getMySubscription(storeId: string): Promise<MySubscriptionDto> {
  const [settings, sub, access, payments, requests] = await Promise.all([
    getSettings(),
    AppDataSource.getRepository(Subscription).findOne({ where: { storeId } }),
    getStoreAccess(storeId),
    AppDataSource.getRepository(SubscriptionPayment).find({ where: { storeId }, order: { createdAt: 'DESC' }, take: 50 }),
    AppDataSource.getRepository(SubscriptionRequest).find({ where: { storeId }, order: { createdAt: 'DESC' }, take: 20 }),
  ]);
  if (!sub) throw HttpError.notFound();

  return {
    access,
    plan: sub.plan,
    currency: settings.currency,
    plans: enabledPlans(settings),
    supportWhatsapp: settings.supportWhatsapp,
    paymentMethods: PAYMENT_METHODS.filter((m) => settings.paymentMethods?.[m]?.enabled).map((m) => ({
      method: m,
      label: PAYMENT_METHOD_LABELS[m],
      details: settings.paymentMethods[m]?.details ?? '',
    })),
    requests: requests.map(toRequestDto),
    payments: payments.map(toPaymentDto),
  };
}

/**
 * The merchant reports a payment. Amount and duration come from the plan as
 * configured now — never from the client. One pending request at a time.
 */
export async function createRequest(storeId: string, input: RequestInput): Promise<SubscriptionRequestDto> {
  const settings = await getSettings();
  const plan = enabledPlans(settings).find((p) => p.id === input.planId);
  if (!plan) throw HttpError.unprocessable('هذه الباقة غير متاحة حالياً', 'PLAN_UNAVAILABLE');
  if (!settings.paymentMethods?.[input.method]?.enabled) {
    throw HttpError.unprocessable('طريقة الدفع هذه غير متاحة حالياً', 'METHOD_UNAVAILABLE');
  }
  if (input.receiptUrl) assertOwnUploads(storeId, [input.receiptUrl]);

  return AppDataSource.transaction(async (m) => {
    // Lock the store's subscription row so two quick submissions can't both pass the pending check.
    await m.findOne(Subscription, { where: { storeId }, lock: { mode: 'pessimistic_write' } });
    const pending = await m.exists(SubscriptionRequest, { where: { storeId, status: 'pending' } });
    if (pending) throw HttpError.conflict('لديك طلب اشتراك قيد المراجعة بالفعل', 'REQUEST_PENDING');

    const request = m.create(SubscriptionRequest, {
      storeId,
      planId: plan.id,
      months: plan.months,
      amount: plan.price,
      currency: settings.currency,
      method: input.method,
      reference: input.reference,
      receiptUrl: input.receiptUrl,
      note: input.note,
      status: 'pending',
    });
    await m.save(request);
    return toRequestDto(request);
  });
}

/** A merchant may withdraw their own pending request (e.g. picked the wrong plan). */
export async function cancelRequest(storeId: string, id: string): Promise<void> {
  const res = await AppDataSource.getRepository(SubscriptionRequest).delete({ id, storeId, status: 'pending' });
  if (!res.affected) throw HttpError.notFound('الطلب غير موجود أو تمت مراجعته');
}
