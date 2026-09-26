'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  canOperate,
  formatMoney,
  PAYMENT_METHOD_LABELS,
  REQUEST_STATUS_LABELS,
  subscriptionRequestSchema,
  type MySubscriptionDto,
  type PaymentMethod,
  type SubscriptionRequestDto,
} from '@matjari/shared';
import { useQueryClient } from '@tanstack/react-query';
import { Ban, Check, CheckCircle2, Clock, Copy, Hourglass, MessageCircle, RotateCw, XCircle } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';
import { AccessBadge, formatDate } from '@/components/access-badge';
import { FormError } from '@/components/auth-card';
import { Button, buttonVariants } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { ImageUpload } from '@/components/ui/image-upload';
import { Input } from '@/components/ui/input';
import { Card, PageHeader, Skeleton } from '@/components/ui/misc';
import { useMySubscription, useSubscriptionRequestActions } from '@/lib/admin-queries';
import { apiError, getErrorMessage } from '@/lib/api';
import { meQueryKey, useMe } from '@/lib/auth';
import { cn, waLink } from '@/lib/utils';

type FormIn = z.input<typeof subscriptionRequestSchema>;
type FormOut = z.output<typeof subscriptionRequestSchema>;

const REFERENCE_LABEL: Partial<Record<PaymentMethod, { label: string; placeholder: string }>> = {
  sham_cash: { label: 'رقم العملية أو اسم المُرسل', placeholder: 'مثال: 58213947' },
  usdt: { label: 'رقم المعاملة (TxID / Hash)', placeholder: '0x…' },
  cash: { label: 'متى وأين تريد التسليم؟', placeholder: 'مثال: حلب، الجمعة بعد الظهر' },
  syriatel_cash: { label: 'رقم العملية', placeholder: '' },
  mtn_cash: { label: 'رقم العملية', placeholder: '' },
  transfer: { label: 'رقم الحوالة واسم المُرسل', placeholder: '' },
};

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={`نسخ ${label}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          toast.error('تعذر النسخ، انسخ يدوياً');
        }
      }}
      className="flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-n-200 bg-n-0 px-3 text-sm font-semibold text-n-700 hover:bg-n-100"
    >
      {copied ? <Check className="size-4 text-success" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      {copied ? 'تم' : 'نسخ'}
    </button>
  );
}

function whatsappMessage(storeName: string, slug: string, r: SubscriptionRequestDto) {
  return [
    'مرحباً، أرسلت دفعة اشتراك متجري:',
    `المتجر: ${storeName} (${slug})`,
    `الباقة: ${r.planName} — ${formatMoney(r.amount, r.currency)}`,
    `طريقة الدفع: ${PAYMENT_METHOD_LABELS[r.method]}`,
    r.reference ? `المرجع: ${r.reference}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

function StatusCard({ data }: { data: MySubscriptionDto }) {
  const { access } = data;
  const operating = canOperate(access.state);
  return (
    <Card
      className={cn(
        'flex flex-col gap-3 p-5',
        access.state === 'grace' && 'border-accent-500/50 bg-accent-50',
        (access.state === 'expired' || access.state === 'suspended') && 'border-status-cancelled-fg/30 bg-[#FEF2F2]',
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        {access.state === 'suspended' ? (
          <Ban className="size-6 text-status-cancelled-fg" aria-hidden />
        ) : operating ? (
          <CheckCircle2 className="size-6 text-status-delivered-fg" aria-hidden />
        ) : (
          <Clock className="size-6 text-status-cancelled-fg" aria-hidden />
        )}
        <h2 className="text-h3 font-bold">حالة متجرك</h2>
        <AccessBadge state={access.state} />
      </div>
      {access.state === 'trial' && (
        <p className="text-n-700">
          أنت في الفترة التجريبية المجانية حتى <strong>{formatDate(access.endsAt)}</strong>. اشترك قبل انتهائها ليبقى متجرك يعمل بدون انقطاع — الأيام المتبقية تُضاف لاشتراكك.
        </p>
      )}
      {access.state === 'active' && (
        <p className="text-n-700">
          اشتراكك فعّال حتى <strong>{formatDate(access.endsAt)}</strong>. يمكنك التجديد مبكراً، والأيام المتبقية لا تضيع.
        </p>
      )}
      {access.state === 'grace' && (
        <p className="text-[#78350F]">
          انتهى اشتراكك في {formatDate(access.endsAt)}. متجرك يعمل لمدة <strong>{access.daysLeft} {access.daysLeft === 1 ? 'يوم' : 'أيام'}</strong> فقط ثم سيتوقف.
        </p>
      )}
      {access.state === 'expired' && (
        <p className="text-[#7F1D1D]">انتهى اشتراكك ومتجرك متوقف حالياً. بياناتك ومنتجاتك وطلباتك محفوظة وتعود فور تفعيل الاشتراك.</p>
      )}
      {access.state === 'suspended' && (
        <div className="text-[#7F1D1D]">
          <p>تم إيقاف متجرك من إدارة المنصة. تواصل معنا لمعرفة التفاصيل.</p>
          {access.suspensionReason && <p className="mt-1 text-sm">السبب: {access.suspensionReason}</p>}
        </div>
      )}
    </Card>
  );
}

function PendingRequest({ request, data }: { request: SubscriptionRequestDto; data: MySubscriptionDto }) {
  const store = useMe().data?.store;
  const { cancel } = useSubscriptionRequestActions();
  const [confirmCancel, setConfirmCancel] = useState(false);
  return (
    <Card className="flex flex-col gap-4 border-status-new-fg/30 bg-status-new-bg/40 p-5">
      <div className="flex items-center gap-2">
        <Hourglass className="size-6 text-status-new-fg" aria-hidden />
        <h2 className="text-h3 font-bold">طلبك قيد المراجعة</h2>
      </div>
      <p className="text-sm text-n-700">وصلنا طلب اشتراكك. سنتحقق من الدفعة ونفعّل اشتراكك في أقرب وقت، وستتغير حالة متجرك هنا تلقائياً.</p>
      <dl className="grid grid-cols-2 gap-3 rounded-md bg-n-0 p-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-n-600">الباقة</dt>
          <dd className="font-semibold">{request.planName}</dd>
        </div>
        <div>
          <dt className="text-n-600">المبلغ</dt>
          <dd className="font-semibold">{formatMoney(request.amount, request.currency)}</dd>
        </div>
        <div>
          <dt className="text-n-600">طريقة الدفع</dt>
          <dd className="font-semibold">{PAYMENT_METHOD_LABELS[request.method]}</dd>
        </div>
        <div>
          <dt className="text-n-600">تاريخ الطلب</dt>
          <dd className="font-semibold">{formatDate(request.createdAt)}</dd>
        </div>
        {request.reference && (
          <div className="col-span-2 sm:col-span-4">
            <dt className="text-n-600">المرجع</dt>
            <dd className="font-semibold break-all">{request.reference}</dd>
          </div>
        )}
      </dl>
      <div className="flex flex-col gap-2 sm:flex-row">
        {data.supportWhatsapp && store && (
          <a
            href={waLink(data.supportWhatsapp, whatsappMessage(store.name, store.slug, request))}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: 'whatsapp' })}
          >
            <MessageCircle aria-hidden />
            أرسل الإشعار على واتساب لتسريع التفعيل
          </a>
        )}
        <Button variant="ghost" onClick={() => setConfirmCancel(true)}>
          إلغاء الطلب
        </Button>
      </div>
      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title="إلغاء طلب الاشتراك؟"
        description="يمكنك إرسال طلب جديد بعد الإلغاء."
        confirmLabel="إلغاء الطلب"
        destructive
        loading={cancel.isPending}
        onConfirm={async () => {
          try {
            await cancel.mutateAsync(request.id);
            setConfirmCancel(false);
            toast.success('تم إلغاء الطلب');
          } catch (err) {
            toast.error(getErrorMessage(err));
          }
        }}
      />
    </Card>
  );
}

function SubscribeForm({ data }: { data: MySubscriptionDto }) {
  const { submit } = useSubscriptionRequestActions();
  const [formError, setFormError] = useState<string | null>(null);
  const recommended = data.plans.find((p) => p.id === 'annual') ?? data.plans[data.plans.length - 1];
  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(subscriptionRequestSchema),
    defaultValues: { planId: recommended?.id, method: data.paymentMethods[0]?.method, reference: '', receiptUrl: null, note: '' },
  });
  const [planId, method] = useWatch({ control, name: ['planId', 'method'] });
  const plan = data.plans.find((p) => p.id === planId);
  const methodInfo = data.paymentMethods.find((m) => m.method === method);
  const refCopy = (method && REFERENCE_LABEL[method]) ?? { label: 'رقم العملية', placeholder: '' };

  if (!data.plans.length || !data.paymentMethods.length) {
    return (
      <Card className="p-5 text-sm text-n-700">
        الاشتراك غير متاح عبر الموقع حالياً.
        {data.supportWhatsapp && (
          <a href={waLink(data.supportWhatsapp, 'مرحباً، أريد الاشتراك في متجري')} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: 'whatsapp', block: true }), 'mt-3')}>
            <MessageCircle aria-hidden />
            تواصل معنا على واتساب
          </a>
        )}
      </Card>
    );
  }

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await submit.mutateAsync(values);
      toast.success('تم إرسال طلبك — سنفعّل اشتراكك بعد التحقق من الدفعة');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setFormError(apiError(err)?.message ?? getErrorMessage(err));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <Card className="flex flex-col gap-4 p-5">
        <div>
          <p className="text-xs font-bold text-brand-700">الخطوة 1</p>
          <h2 className="text-h3 font-bold">اختر باقتك</h2>
        </div>
        <div role="radiogroup" aria-label="الباقات" className="grid gap-3 sm:grid-cols-3">
          {data.plans.map((p) => {
            const active = planId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setValue('planId', p.id, { shouldValidate: true })}
                className={cn(
                  'relative flex cursor-pointer flex-col items-start gap-1 rounded-lg border-2 p-4 text-start transition-colors',
                  active ? 'border-brand-600 bg-brand-50' : 'border-n-200 bg-n-0 hover:border-n-300',
                )}
              >
                {p.id === recommended?.id && data.plans.length > 1 && (
                  <span className="absolute -top-3 start-3 rounded-full bg-brand-700 px-2.5 py-0.5 text-caption font-bold text-n-0">الأوفر</span>
                )}
                <span className="font-bold text-n-900">{p.name}</span>
                <span className="text-h2 font-bold text-n-900">{formatMoney(p.price, data.currency)}</span>
                {p.months > 1 && <span className="text-xs text-n-600">≈ {formatMoney(p.monthlyEquivalent, data.currency)} شهرياً</span>}
                {p.savingsPercent > 0 && <span className="rounded-full bg-status-delivered-bg px-2 py-0.5 text-caption font-bold text-status-delivered-fg">وفّر {p.savingsPercent}%</span>}
                {active && <CheckCircle2 className="absolute top-3 end-3 size-5 text-brand-700" aria-hidden />}
              </button>
            );
          })}
        </div>
        {errors.planId && <p className="text-xs font-medium text-[#B91C1C]">{errors.planId.message}</p>}
      </Card>

      <Card className="flex flex-col gap-4 p-5">
        <div>
          <p className="text-xs font-bold text-brand-700">الخطوة 2</p>
          <h2 className="text-h3 font-bold">ادفع {plan ? formatMoney(plan.price, data.currency) : ''} بإحدى الطرق</h2>
        </div>
        <div role="radiogroup" aria-label="طرق الدفع" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {data.paymentMethods.map((m) => (
            <button
              key={m.method}
              type="button"
              role="radio"
              aria-checked={method === m.method}
              onClick={() => setValue('method', m.method, { shouldValidate: true })}
              className={cn(
                'min-h-12 cursor-pointer rounded-md border-2 px-3 text-sm font-semibold',
                method === m.method ? 'border-brand-600 bg-brand-50 text-n-900' : 'border-n-200 bg-n-0 text-n-700 hover:border-n-300',
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
        {methodInfo && (
          <div className="rounded-md border border-n-200 bg-n-50 p-4">
            {methodInfo.details ? (
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 text-sm font-medium break-all whitespace-pre-line text-n-800" dir="auto">
                  {methodInfo.details}
                </p>
                {/* Copy only the last line (the code or wallet address), not labels such as the network. */}
                {methodInfo.method !== 'cash' && (
                  <CopyButton text={methodInfo.details.split('\n').map((l) => l.trim()).filter(Boolean).pop() ?? methodInfo.details} label={methodInfo.label} />
                )}
              </div>
            ) : (
              <p className="text-sm text-n-700">تواصل معنا على واتساب لتفاصيل الدفع.</p>
            )}
            {methodInfo.method === 'usdt' && (
              <p className="mt-2 text-xs font-medium text-[#B45309]">⚠️ أرسل على الشبكة المذكورة أعلاه فقط — الإرسال على شبكة أخرى يؤدي لضياع المبلغ نهائياً.</p>
            )}
          </div>
        )}
      </Card>

      <Card className="flex flex-col gap-4 p-5">
        <div>
          <p className="text-xs font-bold text-brand-700">الخطوة 3</p>
          <h2 className="text-h3 font-bold">أكّد الدفع</h2>
          <p className="text-sm text-n-600">أرسل لنا ما يثبت الدفع لنفعّل اشتراكك.</p>
        </div>
        <FormError message={formError} />
        <Field label={refCopy.label} optional error={errors.reference?.message}>
          <Input dir="auto" placeholder={refCopy.placeholder} {...register('reference')} />
        </Field>
        {method !== 'cash' && (
          <Controller
            control={control}
            name="receiptUrl"
            render={({ field }) => (
              <ImageUpload
                label="صورة الإشعار (اختياري)"
                aspect="wide"
                value={field.value}
                onChange={field.onChange}
                uploadPath="/subscription/receipt"
                hint="لقطة شاشة لعملية التحويل — تسرّع التفعيل"
              />
            )}
          />
        )}
        <Field label="ملاحظة" optional error={errors.note?.message}>
          <Input {...register('note')} />
        </Field>
        <Button type="submit" size="lg" block loading={isSubmitting}>
          <CheckCircle2 aria-hidden />
          أرسلت الدفعة — فعّل اشتراكي
        </Button>
        {data.supportWhatsapp && (
          <a
            href={waLink(data.supportWhatsapp, 'مرحباً، عندي سؤال عن الاشتراك في متجري')}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-11 items-center justify-center gap-2 text-sm font-semibold text-whatsapp-strong hover:underline"
          >
            <MessageCircle className="size-4" aria-hidden />
            عندك سؤال؟ تواصل معنا على واتساب
          </a>
        )}
      </Card>
    </form>
  );
}

export default function SubscriptionPage() {
  const qc = useQueryClient();
  const { data, isPending, isFetching, refetch } = useMySubscription();

  async function refresh() {
    await Promise.all([refetch(), qc.invalidateQueries({ queryKey: meQueryKey })]);
  }

  if (isPending || !data) {
    return (
      <>
        <PageHeader title="الاشتراك" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-36" />
          <Skeleton className="h-64" />
        </div>
      </>
    );
  }

  const pending = data.requests.find((r) => r.status === 'pending');
  const lastReviewed = data.requests.find((r) => r.status !== 'pending');
  const showRejected = !pending && lastReviewed?.status === 'rejected';

  return (
    <>
      <PageHeader
        title="الاشتراك"
        actions={
          <Button variant="secondary" size="sm" onClick={refresh} loading={isFetching}>
            <RotateCw aria-hidden />
            تحديث الحالة
          </Button>
        }
      />

      <div className="flex flex-col gap-4">
        <StatusCard data={data} />

        {showRejected && lastReviewed && (
          <Card className="flex items-start gap-3 border-status-cancelled-fg/30 p-4">
            <XCircle className="mt-0.5 size-5 shrink-0 text-status-cancelled-fg" aria-hidden />
            <div className="text-sm">
              <p className="font-bold text-n-900">تم رفض طلبك السابق ({lastReviewed.planName})</p>
              {lastReviewed.rejectionReason && <p className="text-n-700">السبب: {lastReviewed.rejectionReason}</p>}
              <p className="mt-1 text-n-600">يمكنك إرسال طلب جديد أدناه.</p>
            </div>
          </Card>
        )}

        {data.access.state !== 'suspended' && (pending ? <PendingRequest request={pending} data={data} /> : <SubscribeForm data={data} />)}

        {data.access.state === 'suspended' && data.supportWhatsapp && (
          <a href={waLink(data.supportWhatsapp, 'مرحباً، بخصوص إيقاف متجري')} target="_blank" rel="noreferrer" className={buttonVariants({ variant: 'whatsapp', size: 'lg', block: true })}>
            <MessageCircle aria-hidden />
            تواصل مع الإدارة
          </a>
        )}

        {(data.payments.length > 0 || data.requests.some((r) => r.status !== 'pending')) && (
          <Card>
            <h2 className="border-b border-n-200 px-4 py-3 font-bold">السجل</h2>
            <ul className="divide-y divide-n-200">
              {data.requests
                .filter((r) => r.status !== 'pending')
                .map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                    <span>
                      <span className="font-semibold">{r.planName}</span>
                      <span className="text-n-600">
                        {' '}
                        · {formatMoney(r.amount, r.currency)} · {PAYMENT_METHOD_LABELS[r.method]} · {formatDate(r.createdAt)}
                      </span>
                    </span>
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-0.5 text-caption font-semibold',
                        r.status === 'approved' ? 'bg-status-delivered-bg text-status-delivered-fg' : 'bg-status-cancelled-bg text-status-cancelled-fg',
                      )}
                    >
                      {REQUEST_STATUS_LABELS[r.status]}
                    </span>
                  </li>
                ))}
              {data.payments.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                  <span>
                    <span className="font-semibold">
                      تفعيل {p.months} {p.months === 1 ? 'شهر' : p.months <= 10 ? 'أشهر' : 'شهراً'}
                    </span>
                    <span className="text-n-600"> · {formatDate(p.createdAt)}</span>
                  </span>
                  <span className="text-n-700">حتى {formatDate(p.periodEnd)}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </>
  );
}
