'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CURRENCIES, CURRENCY_CODES, updateStoreSchema, type StoreDto } from '@matjari/shared';
import { CreditCard } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';
import { FormError } from '@/components/auth-card';
import { ShareStore } from '@/components/dashboard/share-store';
import { SlugInput, useSlugAvailability } from '@/components/slug-field';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input, NativeSelect, Textarea } from '@/components/ui/input';
import { Badge, Card, PageHeader, Spinner } from '@/components/ui/misc';
import { MoneyInput } from '@/components/ui/money-input';
import { Switch } from '@/components/ui/switch';
import { apiError, applyServerErrors, getErrorMessage } from '@/lib/api';
import { useStore } from '@/lib/auth';
import { useUpdateStore } from '@/lib/queries';

const formSchema = updateStoreSchema
  .pick({
    name: true,
    slug: true,
    description: true,
    whatsappNumber: true,
    city: true,
    currency: true,
    minOrderAmount: true,
    isActive: true,
    socialLinks: true,
    businessHours: true,
  })
  .required();
type FormIn = z.input<typeof formSchema>;
type FormOut = z.output<typeof formSchema>;

const PLAN_LABELS = { trial: 'تجريبي', basic: 'أساسي', pro: 'احترافي' } as const;

function toValues(s: StoreDto): FormIn {
  return {
    name: s.name,
    slug: s.slug,
    description: s.description ?? '',
    whatsappNumber: s.whatsappNumber,
    city: s.city ?? '',
    currency: s.currency as FormIn['currency'],
    minOrderAmount: s.minOrderAmount,
    isActive: s.isActive,
    socialLinks: s.socialLinks,
    businessHours: s.businessHours,
  };
}

function SettingsForm({ store }: { store: StoreDto }) {
  const update = useUpdateStore();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormIn, unknown, FormOut>({ resolver: zodResolver(formSchema), defaultValues: toValues(store) });
  const [slug, currency] = useWatch({ control, name: ['slug', 'currency'] });
  const availability = useSlugAvailability(slug ?? '');

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    if (values.slug !== store.slug && availability.data && !availability.data.available) {
      setError('slug', { message: availability.data.reason ?? 'الرابط غير متاح' });
      return;
    }
    try {
      const updated = await update.mutateAsync(values);
      reset(toValues(updated));
      toast.success('تم حفظ الإعدادات');
    } catch (err) {
      const e = apiError(err);
      if (e?.code === 'SLUG_TAKEN') setError('slug', { message: e.message });
      else if (!applyServerErrors(err, setError)) setFormError(getErrorMessage(err));
    }
  });

  const trialEnds = store.subscription?.trialEndsAt ? new Date(store.subscription.trialEndsAt) : null;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 pb-4">
      <FormError message={formError} />

      <Card className="flex flex-col gap-4 p-4">
        <h2 className="font-bold">معلومات المتجر</h2>
        <Field label="اسم المتجر" error={errors.name?.message}>
          <Input {...register('name')} />
        </Field>
        <Field label="رابط المتجر" error={errors.slug?.message} hint={slug !== store.slug ? 'تغيير الرابط يوقف الروابط القديمة المشتركة سابقاً' : undefined}>
          <Controller
            control={control}
            name="slug"
            render={({ field }) => (
              <SlugInput
                {...field}
                value={field.value ?? ''}
                aria-label="رابط المتجر"
                onChange={(e) => field.onChange(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                availability={availability}
              />
            )}
          />
        </Field>
        <Field label="وصف المتجر" optional error={errors.description?.message} hint="يظهر في أعلى المتجر وفي نتائج البحث عند المشاركة">
          <Textarea rows={3} {...register('description')} />
        </Field>
        <Controller
          control={control}
          name="isActive"
          render={({ field }) => (
            <Switch
              checked={field.value ?? true}
              onCheckedChange={field.onChange}
              label="المتجر مفتوح للزبائن"
              description="عند الإيقاف يظهر للزبائن أن المتجر غير متاح"
            />
          )}
        />
      </Card>

      <Card className="grid gap-4 p-4 sm:grid-cols-2">
        <h2 className="font-bold sm:col-span-2">التواصل والطلبات</h2>
        <Field label="رقم واتساب لاستلام الطلبات" error={errors.whatsappNumber?.message}>
          <Input type="tel" dir="ltr" inputMode="tel" {...register('whatsappNumber')} />
        </Field>
        <Field label="المدينة" optional error={errors.city?.message}>
          <Input {...register('city')} />
        </Field>
        <Field label="العملة" select error={errors.currency?.message} hint="تغيير العملة لا يحوّل الأسعار الحالية">
          <NativeSelect {...register('currency')}>
            {CURRENCY_CODES.map((c) => (
              <option key={c} value={c}>
                {CURRENCIES[c].label} ({CURRENCIES[c].symbol})
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Controller
          control={control}
          name="minOrderAmount"
          render={({ field }) => (
            <Field label="الحد الأدنى للطلب" error={errors.minOrderAmount?.message} hint="0 = بدون حد أدنى">
              <MoneyInput currency={currency ?? store.currency} value={field.value} onChange={(v) => field.onChange(v ?? 0)} onBlur={field.onBlur} />
            </Field>
          )}
        />
        <Field label="أوقات العمل" optional className="sm:col-span-2" error={errors.businessHours?.summary?.message}>
          <Input placeholder="مثال: يومياً من 10 صباحاً حتى 10 مساءً" {...register('businessHours.summary')} />
        </Field>
      </Card>

      <Card className="grid gap-4 p-4 sm:grid-cols-3">
        <h2 className="font-bold sm:col-span-3">روابط التواصل الاجتماعي</h2>
        <Field label="إنستغرام" optional error={errors.socialLinks?.instagram?.message}>
          <Input dir="ltr" placeholder="https://instagram.com/…" {...register('socialLinks.instagram')} />
        </Field>
        <Field label="فيسبوك" optional error={errors.socialLinks?.facebook?.message}>
          <Input dir="ltr" placeholder="https://facebook.com/…" {...register('socialLinks.facebook')} />
        </Field>
        <Field label="تيك توك" optional error={errors.socialLinks?.tiktok?.message}>
          <Input dir="ltr" placeholder="https://tiktok.com/@…" {...register('socialLinks.tiktok')} />
        </Field>
      </Card>

      <Card className="flex flex-col gap-3 p-4">
        <h2 className="flex items-center gap-2 font-bold">
          <CreditCard className="size-5 text-n-600" aria-hidden />
          الاشتراك
        </h2>
        {store.subscription ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge tone="brand">{PLAN_LABELS[store.subscription.plan]}</Badge>
            {store.subscription.plan === 'trial' && trialEnds && (
              <span className="text-n-700">تنتهي التجربة في {trialEnds.toLocaleDateString('ar-SY-u-nu-latn', { dateStyle: 'long' })}</span>
            )}
          </div>
        ) : (
          <p className="text-sm text-n-600">لا يوجد اشتراك.</p>
        )}
      </Card>

      <div className="sticky bottom-20 z-10 lg:bottom-4">
        <Button type="submit" size="lg" block className="shadow-lg sm:ms-auto sm:w-auto" loading={isSubmitting} disabled={!isDirty}>
          حفظ الإعدادات
        </Button>
      </div>
    </form>
  );
}

export default function SettingsPage() {
  const store = useStore();
  return (
    <>
      <PageHeader title="الإعدادات" />
      {store ? (
        <>
          <div className="mb-4">
            <ShareStore slug={store.slug} />
          </div>
          <SettingsForm key={store.id} store={store} />
        </>
      ) : (
        <Spinner />
      )}
    </>
  );
}
