'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  buildPlans,
  formatMoney,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  PLAN_DEFS,
  PLAN_IDS,
  platformSettingsSchema,
  type PaymentMethod,
  type PlatformSettings,
} from '@matjari/shared';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';
import { FormError } from '@/components/auth-card';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input, NativeSelect, Textarea } from '@/components/ui/input';
import { Card, PageHeader, Skeleton } from '@/components/ui/misc';
import { MoneyInput } from '@/components/ui/money-input';
import { Switch } from '@/components/ui/switch';
import { applyServerErrors, getErrorMessage } from '@/lib/api';
import { useAdminSettings, useUpdatePlatformSettings } from '@/lib/admin-queries';

type FormIn = z.input<typeof platformSettingsSchema>;
type FormOut = z.output<typeof platformSettingsSchema>;

const DETAILS_PLACEHOLDER: Record<PaymentMethod, string> = {
  sham_cash: 'كود حساب شام كاش',
  usdt: 'عنوان المحفظة + الشبكة، مثال:\nالشبكة: BEP20\n0x…',
  cash: 'كيف يتم التسليم، مثال: بالتنسيق على واتساب داخل حلب ودمشق',
  syriatel_cash: 'رقم المحفظة واسم صاحبها',
  mtn_cash: 'رقم المحفظة واسم صاحبها',
  transfer: 'اسم المستلم الكامل، المدينة، ورقم الهاتف',
};

function SettingsForm({ settings }: { settings: PlatformSettings }) {
  const update = useUpdatePlatformSettings();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormIn, unknown, FormOut>({ resolver: zodResolver(platformSettingsSchema), defaultValues: settings });
  const [methods, plans, currency] = useWatch({ control, name: ['paymentMethods', 'plans', 'currency'] });
  const preview = buildPlans(plans ?? {});

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      reset(await update.mutateAsync(values));
      toast.success('تم حفظ إعدادات المنصة');
    } catch (err) {
      if (!applyServerErrors(err, setError)) setFormError(getErrorMessage(err));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <FormError message={formError} />

      <Card className="flex flex-col gap-4 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-bold">الباقات والأسعار</h2>
            <p className="text-xs text-n-600">تظهر للتجار بصفحة «الاشتراك» وبالصفحة الرئيسية.</p>
          </div>
          <Field label="العملة" select className="w-40">
            <NativeSelect {...register('currency')}>
              <option value="USD">دولار ($)</option>
              <option value="SYP">ليرة سورية</option>
            </NativeSelect>
          </Field>
        </div>
        {PLAN_IDS.map((id) => {
          const p = preview.find((x) => x.id === id);
          return (
            <div key={id} className="grid items-end gap-3 rounded-md border border-n-200 p-3 sm:grid-cols-[1fr_200px]">
              <div className="flex flex-col gap-1">
                <Controller
                  control={control}
                  name={`plans.${id}.enabled`}
                  render={({ field }) => (
                    <Switch checked={field.value} onCheckedChange={field.onChange} label={`${PLAN_DEFS[id].name} (${PLAN_DEFS[id].months} ${PLAN_DEFS[id].months === 1 ? 'شهر' : PLAN_DEFS[id].months <= 10 ? 'أشهر' : 'شهراً'})`} />
                  )}
                />
                {p && p.months > 1 && (
                  <p className="text-xs text-n-600">
                    ≈ {formatMoney(p.monthlyEquivalent, currency ?? 'USD')} شهرياً{p.savingsPercent > 0 ? ` · توفير ${p.savingsPercent}% مقارنة بالشهري` : ' · بدون توفير مقارنة بالشهري'}
                  </p>
                )}
              </div>
              <Controller
                control={control}
                name={`plans.${id}.price`}
                render={({ field }) => (
                  <Field label="السعر" error={errors.plans?.[id]?.price?.message}>
                    <MoneyInput currency={currency ?? 'USD'} value={field.value} onChange={(v) => field.onChange(v ?? 0)} onBlur={field.onBlur} />
                  </Field>
                )}
              />
            </div>
          );
        })}
        {errors.plans?.message && <p className="text-xs font-medium text-[#B91C1C]">{errors.plans.message}</p>}
        {errors.plans?.root?.message && <p className="text-xs font-medium text-[#B91C1C]">{errors.plans.root.message}</p>}
      </Card>

      <Card className="grid gap-4 p-4 sm:grid-cols-2">
        <h2 className="font-bold sm:col-span-2">التجربة والتواصل</h2>
        <Field label="أيام التجربة المجانية" error={errors.trialDays?.message} hint="تُطبّق على المتاجر الجديدة فقط">
          <Input type="number" min={0} max={90} dir="ltr" className="text-end" {...register('trialDays', { valueAsNumber: true })} />
        </Field>
        <Field label="أيام السماح بعد الانتهاء" error={errors.graceDays?.message} hint="المتجر يبقى يعمل مع تنبيه، ثم يتوقف">
          <Input type="number" min={0} max={30} dir="ltr" className="text-end" {...register('graceDays', { valueAsNumber: true })} />
        </Field>
        <Field label="رقم واتساب الدعم" error={errors.supportWhatsapp?.message} hint="يتواصل عليه التجار للاشتراك والاستفسار" className="sm:col-span-2">
          <Input type="tel" dir="ltr" inputMode="tel" {...register('supportWhatsapp')} />
        </Field>
      </Card>

      <Card className="flex flex-col gap-4 p-4">
        <div>
          <h2 className="font-bold">طرق الدفع</h2>
          <p className="text-xs text-n-600">الطرق المفعّلة وتفاصيلها تظهر للتاجر عند الاشتراك، مع زر نسخ.</p>
        </div>
        {PAYMENT_METHODS.map((m) => (
          <div key={m} className="flex flex-col gap-2 rounded-md border border-n-200 p-3">
            <Controller
              control={control}
              name={`paymentMethods.${m}.enabled`}
              render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} label={PAYMENT_METHOD_LABELS[m]} />}
            />
            {methods?.[m]?.enabled && (
              <Field label="التفاصيل" error={errors.paymentMethods?.[m]?.details?.message}>
                <Textarea rows={m === 'usdt' ? 3 : 2} dir="auto" placeholder={DETAILS_PLACEHOLDER[m]} {...register(`paymentMethods.${m}.details`)} />
              </Field>
            )}
          </div>
        ))}
      </Card>

      <div className="sticky bottom-20 z-10 lg:bottom-4">
        <Button type="submit" size="lg" block className="shadow-lg sm:ms-auto sm:w-auto" loading={isSubmitting} disabled={!isDirty}>
          حفظ الإعدادات
        </Button>
      </div>
    </form>
  );
}

export default function AdminSettingsPage() {
  const { data } = useAdminSettings();
  return (
    <>
      <PageHeader title="إعدادات المنصة" description="الباقات، مدة التجربة، وطرق الدفع" />
      {data ? (
        <SettingsForm settings={data} />
      ) : (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      )}
    </>
  );
}
