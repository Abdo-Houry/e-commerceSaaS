'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  CURRENCIES,
  CURRENCY_CODES,
  createStoreSchema,
  DEFAULT_PRIMARY_COLOR,
  DEFAULT_SECONDARY_COLOR,
  slugify,
  type StoreDto,
} from '@matjari/shared';
import { ArrowLeft, ArrowRight, LogOut, Store } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Controller, useForm, useWatch, type FieldPath } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';
import { FormError } from '@/components/auth-card';
import { ColorField } from '@/components/color-field';
import { SlugInput, useSlugAvailability } from '@/components/slug-field';
import { TemplatePicker } from '@/components/template-picker';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { ImageUpload } from '@/components/ui/image-upload';
import { Input, NativeSelect } from '@/components/ui/input';
import { Card, Spinner } from '@/components/ui/misc';
import { api, apiError, applyServerErrors, getErrorMessage, unwrap } from '@/lib/api';
import { useAuthActions, useAuthGuard } from '@/lib/auth';
import { cn } from '@/lib/utils';

type FormIn = z.input<typeof createStoreSchema>;
type FormOut = z.output<typeof createStoreSchema>;

const STEPS: { title: string; description: string; fields: FieldPath<FormIn>[] }[] = [
  { title: 'اسم متجرك', description: 'هذا ما سيراه زبائنك، ويمكنك تغييره لاحقاً.', fields: ['name', 'slug'] },
  { title: 'التواصل', description: 'ستصلك الطلبات على رقم واتساب هذا.', fields: ['whatsappNumber', 'city', 'currency'] },
  { title: 'الهوية', description: 'شعار وألوان متجرك.', fields: ['logoUrl', 'primaryColor', 'secondaryColor'] },
  { title: 'القالب', description: 'اختر شكل عرض منتجاتك.', fields: ['template'] },
];

export default function OnboardingPage() {
  const allowed = useAuthGuard('onboarding');
  const router = useRouter();
  const { setStore, logout } = useAuthActions();
  const [step, setStep] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(createStoreSchema),
    mode: 'onTouched',
    defaultValues: {
      name: '',
      slug: '',
      whatsappNumber: '',
      city: '',
      currency: 'SYP',
      logoUrl: null,
      primaryColor: DEFAULT_PRIMARY_COLOR,
      secondaryColor: DEFAULT_SECONDARY_COLOR,
      template: 'classic',
    },
  });
  const { register, control, handleSubmit, trigger, setValue, setError, getFieldState, formState } = form;
  const [slug, primaryColor] = useWatch({ control, name: ['slug', 'primaryColor'] });
  const availability = useSlugAvailability(slug ?? '');

  if (!allowed) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner />
      </div>
    );
  }

  async function next() {
    const valid = await trigger(STEPS[step]!.fields, { shouldFocus: true });
    if (!valid) return;
    if (step === 0) {
      if (availability.checking) return toast.info('جاري التحقق من الرابط…');
      if (availability.data && !availability.data.available) {
        setError('slug', { message: availability.data.reason ?? 'الرابط غير متاح' }, { shouldFocus: true });
        return;
      }
    }
    setStep((s) => s + 1);
  }

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const store = await unwrap<StoreDto>(api.post('/store', values));
      setStore(store);
      toast.success('تم إنشاء متجرك 🎉');
      router.replace('/dashboard/products/new?first=1');
    } catch (err) {
      const e = apiError(err);
      if (e?.code === 'SLUG_TAKEN') {
        setError('slug', { message: e.message });
        setStep(0);
      } else if (applyServerErrors(err, setError)) {
        const firstBad = STEPS.findIndex((s) => s.fields.some((f) => getFieldState(f).error));
        if (firstBad >= 0) setStep(firstBad);
      } else {
        setFormError(getErrorMessage(err));
      }
    }
  });

  const current = STEPS[step]!;
  const last = step === STEPS.length - 1;

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-brand-50 to-n-50">
      <header className="mx-auto flex h-16 w-full max-w-xl items-center justify-between px-4">
        <span className="flex items-center gap-2 text-h3 font-bold text-brand-700">
          <span className="flex size-9 items-center justify-center rounded-md bg-brand-700 text-n-0">
            <Store className="size-5" aria-hidden />
          </span>
          متجري
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            await logout();
            router.replace('/login');
          }}
        >
          <LogOut aria-hidden />
          خروج
        </Button>
      </header>

      <main className="mx-auto w-full max-w-xl flex-1 px-4 pb-10">
        <ol className="flex gap-2" aria-label="خطوات الإعداد">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex-1">
              <span className={cn('block h-1.5 rounded-full', i <= step ? 'bg-brand-600' : 'bg-n-200')} />
              <span className={cn('mt-1.5 block text-caption', i === step ? 'font-bold text-n-900' : 'text-n-600')}>
                <span className="sr-only">الخطوة {i + 1}: </span>
                {s.title}
              </span>
            </li>
          ))}
        </ol>

        <Card className="mt-6 p-5 shadow-sm sm:p-6">
          <p className="text-xs font-semibold text-brand-700">
            الخطوة {step + 1} من {STEPS.length}
          </p>
          <h1 className="mt-1 text-h2 font-bold">{current.title}</h1>
          <p className="mt-1 text-sm text-n-600">{current.description}</p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (last) void onSubmit();
              else void next();
            }}
            noValidate
            className="mt-6 flex flex-col gap-5"
          >
            <FormError message={formError} />

            {step === 0 && (
              <>
                <Field label="اسم المتجر" error={formState.errors.name?.message}>
                  <Input
                    placeholder="مثال: متجر الياسمين"
                    {...register('name', {
                      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                        if (!getFieldState('slug').isDirty) {
                          const auto = slugify(e.target.value);
                          if (auto) setValue('slug', auto);
                        }
                      },
                    })}
                  />
                </Field>
                <Field
                  label="رابط المتجر"
                  error={formState.errors.slug?.message}
                  hint={!formState.errors.slug ? 'أحرف إنجليزية صغيرة وأرقام وشرطة (-)' : undefined}
                >
                  <Controller
                    control={control}
                    name="slug"
                    render={({ field }) => (
                      <SlugInput
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                        availability={availability}
                        placeholder="yasmine"
                        aria-label="رابط المتجر"
                      />
                    )}
                  />
                </Field>
              </>
            )}

            {step === 1 && (
              <>
                <Field label="رقم واتساب" error={formState.errors.whatsappNumber?.message} hint="مثال: 0944123456 أو ‎+963944123456">
                  <Input type="tel" dir="ltr" inputMode="tel" autoComplete="tel" {...register('whatsappNumber')} />
                </Field>
                <Field label="المدينة" optional error={formState.errors.city?.message}>
                  <Input placeholder="دمشق" {...register('city')} />
                </Field>
                <Field label="العملة" select error={formState.errors.currency?.message}>
                  <NativeSelect {...register('currency')}>
                    {CURRENCY_CODES.map((c) => (
                      <option key={c} value={c}>
                        {CURRENCIES[c].label} ({CURRENCIES[c].symbol})
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
              </>
            )}

            {step === 2 && (
              <>
                <Controller
                  control={control}
                  name="logoUrl"
                  render={({ field, fieldState }) => (
                    <ImageUpload label="شعار المتجر (اختياري)" value={field.value} onChange={field.onChange} error={fieldState.error?.message} />
                  )}
                />
                <div className="grid gap-5 sm:grid-cols-2">
                  <Controller
                    control={control}
                    name="primaryColor"
                    render={({ field, fieldState }) => (
                      <ColorField label="اللون الأساسي" value={field.value ?? ''} onChange={field.onChange} error={fieldState.error?.message} />
                    )}
                  />
                  <Controller
                    control={control}
                    name="secondaryColor"
                    render={({ field, fieldState }) => (
                      <ColorField label="اللون الثانوي" value={field.value ?? ''} onChange={field.onChange} error={fieldState.error?.message} />
                    )}
                  />
                </div>
              </>
            )}

            {step === 3 && (
              <Controller
                control={control}
                name="template"
                render={({ field }) => (
                  <TemplatePicker value={field.value ?? 'classic'} onChange={field.onChange} brand={primaryColor ?? DEFAULT_PRIMARY_COLOR} />
                )}
              />
            )}

            <div className="mt-2 flex items-center justify-between gap-3">
              {step > 0 ? (
                <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
                  <ArrowRight aria-hidden />
                  السابق
                </Button>
              ) : (
                <span />
              )}
              <Button type="submit" size="lg" loading={formState.isSubmitting}>
                {last ? 'إنشاء المتجر' : 'التالي'}
                {!last && <ArrowLeft aria-hidden />}
              </Button>
            </div>
          </form>
        </Card>
      </main>
    </div>
  );
}
