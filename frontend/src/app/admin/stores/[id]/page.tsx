'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  activateSubscriptionSchema,
  buildPlans,
  formatMoney,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  type AdminStoreDetailDto,
} from '@matjari/shared';
import { ArrowRight, Ban, CalendarPlus, CheckCircle2, ExternalLink, Mail, MessageCircle, Sparkles, Store } from 'lucide-react';
import Link from 'next/link';
import { use, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';
import { AccessBadge, formatDate } from '@/components/access-badge';
import { FormError } from '@/components/auth-card';
import { Button, buttonVariants } from '@/components/ui/button';
import { ConfirmDialog, Dialog, DialogContent } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input, NativeSelect, Textarea } from '@/components/ui/input';
import { Card, EmptyState, Skeleton } from '@/components/ui/misc';
import { MoneyInput } from '@/components/ui/money-input';
import { useAdminSettings, useAdminStore, useAdminStoreActions } from '@/lib/admin-queries';
import { getErrorMessage } from '@/lib/api';
import { assetUrl, waLink } from '@/lib/utils';

type ActivateIn = z.input<typeof activateSubscriptionSchema>;
type ActivateOut = z.output<typeof activateSubscriptionSchema>;

function ActivateDialog({ store, open, onOpenChange }: { store: AdminStoreDetailDto; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { activate } = useAdminStoreActions(store.id);
  const settings = useAdminSettings().data;
  const currency = settings?.currency ?? 'USD';
  const plans = settings ? buildPlans(settings.plans) : [];
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ActivateIn, unknown, ActivateOut>({
    resolver: zodResolver(activateSubscriptionSchema),
    defaultValues: { planId: null, months: 1, amount: 0, method: 'sham_cash', note: '' },
  });
  const planId = watch('planId');

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      const updated = await activate.mutateAsync(values);
      toast.success(`تم التفعيل حتى ${formatDate(updated.access.endsAt)}`);
      reset();
      onOpenChange(false);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  });

  const currentEnd = store.access.endsAt && new Date(store.access.endsAt) > new Date() ? store.access.endsAt : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="تفعيل / تجديد الاشتراك" description={store.name} sheet>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <FormError message={error} />
          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold text-n-800">الباقة</legend>
            <div className="grid grid-cols-3 gap-2">
              {plans.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={planId === p.id}
                  onClick={() => {
                    setValue('planId', p.id);
                    setValue('months', p.months);
                    setValue('amount', p.price);
                  }}
                  className="flex min-h-14 cursor-pointer flex-col items-center justify-center rounded-md border-2 border-n-200 text-sm font-semibold aria-pressed:border-brand-600 aria-pressed:bg-brand-50"
                >
                  {p.name}
                  <span className="text-xs font-normal text-n-600">{formatMoney(p.price, currency)}</span>
                </button>
              ))}
            </div>
            <Field label="أو عدد أشهر مخصص" className="mt-3" error={errors.months?.message}>
              <Input
                type="number"
                min={1}
                max={36}
                dir="ltr"
                className="text-end"
                {...register('months', { valueAsNumber: true, onChange: () => setValue('planId', null) })}
              />
            </Field>
          </fieldset>
          <p className="rounded-md bg-n-100 px-3 py-2 text-xs text-n-700">
            {currentEnd
              ? `سيُضاف إلى نهاية الفترة الحالية (${formatDate(currentEnd)}) — لا تضيع أيام.`
              : 'يبدأ من اليوم.'}
          </p>
          <Controller
            control={control}
            name="amount"
            render={({ field }) => (
              <Field label="المبلغ المستلم" error={errors.amount?.message}>
                <MoneyInput currency={currency} value={field.value} onChange={(v) => field.onChange(v ?? 0)} onBlur={field.onBlur} />
              </Field>
            )}
          />
          <Field label="طريقة الدفع" select error={errors.method?.message}>
            <NativeSelect {...register('method')}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {PAYMENT_METHOD_LABELS[m]}
                </option>
              ))}
              <option value="other">أخرى / مجاني</option>
            </NativeSelect>
          </Field>
          <Field label="ملاحظة" optional error={errors.note?.message} hint="مثلاً: رقم إشعار التحويل">
            <Input {...register('note')} />
          </Field>
          <Button type="submit" size="lg" block loading={isSubmitting}>
            <CheckCircle2 aria-hidden />
            تفعيل
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminStoreDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: store, isPending, error } = useAdminStore(id);
  const actions = useAdminStoreActions(id);
  const [activateOpen, setActivateOpen] = useState(false);
  const [trialOpen, setTrialOpen] = useState(false);
  const [trialDays, setTrialDays] = useState(7);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [unsuspendOpen, setUnsuspendOpen] = useState(false);

  if (isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-60" />
        <Skeleton className="h-44" />
        <Skeleton className="h-44" />
      </div>
    );
  }
  if (error || !store) {
    return (
      <EmptyState
        icon={<Store />}
        title="المتجر غير موجود"
        action={
          <Link href="/admin/stores" className={buttonVariants()}>
            العودة للمتاجر
          </Link>
        }
      />
    );
  }

  const a = store.access;
  const logo = assetUrl(store.logoUrl);

  return (
    <>
      <Link href="/admin/stores" className="mb-3 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-n-600 hover:text-n-900">
        <ArrowRight className="size-4" aria-hidden />
        المتاجر
      </Link>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <span className="flex size-14 items-center justify-center overflow-hidden rounded-lg bg-n-100 text-n-500">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" className="size-full object-cover" />
          ) : (
            <Store className="size-6" aria-hidden />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-h2 font-bold">{store.name}</h1>
            <AccessBadge state={a.state} />
            {!store.isActive && <span className="text-xs text-n-600">(أغلقه التاجر)</span>}
          </div>
          <a href={`/s/${store.slug}`} target="_blank" rel="noreferrer" dir="ltr" className="inline-flex items-center gap-1 text-sm text-brand-700 hover:underline">
            /s/{store.slug}
            <ExternalLink className="size-3.5" aria-hidden />
          </a>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card className="flex flex-col gap-4 p-4">
            <h2 className="font-bold">الاشتراك</h2>
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-n-600">النوع</dt>
                <dd className="font-semibold">{store.plan === 'trial' ? 'تجربة مجانية' : 'مدفوع'}</dd>
              </div>
              <div>
                <dt className="text-n-600">ينتهي</dt>
                <dd className="font-semibold">{formatDate(a.endsAt)}</dd>
              </div>
              <div>
                <dt className="text-n-600">يتوقف المتجر</dt>
                <dd className="font-semibold">{a.state === 'suspended' ? 'موقوف الآن' : formatDate(a.graceEndsAt)}</dd>
              </div>
            </dl>
            {a.state === 'suspended' && a.suspensionReason && (
              <p className="rounded-md bg-status-cancelled-bg px-3 py-2 text-sm text-status-cancelled-fg">سبب الإيقاف: {a.suspensionReason}</p>
            )}
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button onClick={() => setActivateOpen(true)}>
                <CheckCircle2 aria-hidden />
                تفعيل / تجديد
              </Button>
              {store.plan === 'trial' && (
                <Button variant="secondary" onClick={() => setTrialOpen(true)}>
                  <Sparkles aria-hidden />
                  تمديد التجربة
                </Button>
              )}
              {a.state === 'suspended' ? (
                <Button variant="secondary" onClick={() => setUnsuspendOpen(true)}>
                  إلغاء الإيقاف
                </Button>
              ) : (
                <Button variant="danger-ghost" className="sm:ms-auto" onClick={() => setSuspendOpen(true)}>
                  <Ban aria-hidden />
                  إيقاف المتجر
                </Button>
              )}
            </div>
          </Card>

          <Card>
            <h2 className="border-b border-n-200 px-4 py-3 font-bold">سجل المدفوعات</h2>
            {store.payments.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-n-600">لا توجد مدفوعات بعد.</p>
            ) : (
              <ul className="divide-y divide-n-200">
                {store.payments.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-start justify-between gap-2 px-4 py-3 text-sm">
                    <div>
                      <p className="font-semibold">
                        {p.months} {p.months === 1 ? 'شهر' : 'أشهر'} · {formatMoney(p.amount, p.currency)}
                      </p>
                      <p className="text-xs text-n-600">
                        {p.method === 'other' ? 'أخرى' : PAYMENT_METHOD_LABELS[p.method]} · {formatDate(p.createdAt)}
                        {p.adminName ? ` · بواسطة ${p.adminName}` : ''}
                      </p>
                      {p.note && <p className="text-xs text-n-700">{p.note}</p>}
                    </div>
                    <span className="text-xs text-n-600">حتى {formatDate(p.periodEnd)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-3 p-4 text-sm">
            <h2 className="font-bold">التاجر</h2>
            <p className="font-semibold">{store.owner.name}</p>
            <a href={`mailto:${store.owner.email}`} className="flex items-center gap-2 text-brand-700 hover:underline" dir="ltr">
              <Mail className="size-4" aria-hidden />
              {store.owner.email}
            </a>
            <a
              href={waLink(store.whatsappNumber, `مرحباً، بخصوص متجرك «${store.name}» على منصة متجري`)}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: 'whatsapp', size: 'sm', block: true })}
            >
              <MessageCircle aria-hidden />
              مراسلة على واتساب
            </a>
          </Card>
          <Card className="grid grid-cols-2 gap-3 p-4 text-sm">
            <div>
              <p className="text-n-600">المنتجات</p>
              <p className="text-h3 font-bold">{store.productCount}</p>
            </div>
            <div>
              <p className="text-n-600">الطلبات</p>
              <p className="text-h3 font-bold">{store.orderCount}</p>
            </div>
            <div className="col-span-2">
              <p className="text-n-600">مبيعات مُسلّمة</p>
              <p className="font-bold">{formatMoney(store.deliveredRevenue, store.currency)}</p>
            </div>
            <div>
              <p className="text-n-600">آخر طلب</p>
              <p className="font-semibold">{formatDate(store.lastOrderAt)}</p>
            </div>
            <div>
              <p className="text-n-600">تاريخ التسجيل</p>
              <p className="font-semibold">{formatDate(store.createdAt)}</p>
            </div>
          </Card>
        </div>
      </div>

      <ActivateDialog store={store} open={activateOpen} onOpenChange={setActivateOpen} />

      <Dialog open={trialOpen} onOpenChange={setTrialOpen}>
        <DialogContent title="تمديد التجربة المجانية" description={store.name}>
          <div className="flex flex-col gap-4">
            <Field label="عدد الأيام الإضافية">
              <Input type="number" min={1} max={90} dir="ltr" value={trialDays} onChange={(e) => setTrialDays(Number(e.target.value))} />
            </Field>
            <Button
              block
              loading={actions.extendTrial.isPending}
              onClick={async () => {
                try {
                  const s = await actions.extendTrial.mutateAsync(trialDays);
                  toast.success(`التجربة ممددة حتى ${formatDate(s.access.endsAt)}`);
                  setTrialOpen(false);
                } catch (err) {
                  toast.error(getErrorMessage(err));
                }
              }}
            >
              <CalendarPlus aria-hidden />
              تمديد
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={suspendOpen} onOpenChange={setSuspendOpen}>
        <DialogContent title="إيقاف المتجر" description="سيختفي المتجر عن الزبائن وتُقفل لوحة التاجر حتى تلغي الإيقاف.">
          <div className="flex flex-col gap-4">
            <Field label="السبب (يظهر للتاجر)">
              <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />
            </Field>
            <Button
              variant="danger"
              block
              disabled={!reason.trim()}
              loading={actions.suspend.isPending}
              onClick={async () => {
                try {
                  await actions.suspend.mutateAsync(reason.trim());
                  toast.success('تم إيقاف المتجر');
                  setSuspendOpen(false);
                  setReason('');
                } catch (err) {
                  toast.error(getErrorMessage(err));
                }
              }}
            >
              <Ban aria-hidden />
              إيقاف
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={unsuspendOpen}
        onOpenChange={setUnsuspendOpen}
        title="إلغاء إيقاف المتجر؟"
        description="سيعود المتجر للعمل حسب حالة اشتراكه."
        confirmLabel="إلغاء الإيقاف"
        loading={actions.unsuspend.isPending}
        onConfirm={async () => {
          try {
            await actions.unsuspend.mutateAsync();
            toast.success('عاد المتجر للعمل');
            setUnsuspendOpen(false);
          } catch (err) {
            toast.error(getErrorMessage(err));
          }
        }}
      />
    </>
  );
}
