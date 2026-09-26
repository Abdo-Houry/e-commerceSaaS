'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { STORE_FONT_LABELS, STORE_FONTS, updateStoreSchema, type StoreDto } from '@matjari/shared';
import { Eye, Monitor, RotateCw, SlidersHorizontal, Smartphone } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';
import { FormError } from '@/components/auth-card';
import { ColorField } from '@/components/color-field';
import { TemplatePicker } from '@/components/template-picker';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { ImageUpload } from '@/components/ui/image-upload';
import { Input } from '@/components/ui/input';
import { Card, PageHeader, Spinner } from '@/components/ui/misc';
import { useDebouncedValue } from '@/hooks/use-debounce';
import { applyServerErrors, getErrorMessage } from '@/lib/api';
import { useStore } from '@/lib/auth';
import { PREVIEW_MESSAGE, PREVIEW_READY, type PreviewMessage } from '@/lib/preview';
import { useUpdateStore } from '@/lib/queries';
import { cn } from '@/lib/utils';

const formSchema = updateStoreSchema
  .pick({
    template: true,
    primaryColor: true,
    secondaryColor: true,
    font: true,
    logoUrl: true,
    faviconUrl: true,
    bannerUrl: true,
    bannerTitle: true,
    bannerSubtitle: true,
  })
  .required();
type FormIn = z.input<typeof formSchema>;
type FormOut = z.output<typeof formSchema>;

function toValues(s: StoreDto): FormIn {
  return {
    template: s.template,
    primaryColor: s.primaryColor,
    secondaryColor: s.secondaryColor,
    font: s.font,
    logoUrl: s.logoUrl,
    faviconUrl: s.faviconUrl,
    bannerUrl: s.bannerUrl,
    bannerTitle: s.bannerTitle ?? '',
    bannerSubtitle: s.bannerSubtitle ?? '',
  };
}

function DesignEditor({ store }: { store: StoreDto }) {
  const update = useUpdateStore();
  const iframe = useRef<HTMLIFrameElement>(null);
  const [mobileView, setMobileView] = useState<'controls' | 'preview'>('controls');
  const [device, setDevice] = useState<'mobile' | 'desktop'>('mobile');
  const [frameKey, setFrameKey] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormIn, unknown, FormOut>({ resolver: zodResolver(formSchema), defaultValues: toValues(store) });

  const watched = useWatch({ control });
  // Debounce live-preview updates so dragging a colour picker doesn't flood the iframe.
  // A serialised value keeps the debounce stable across re-renders.
  const draftJson = useDebouncedValue(JSON.stringify(watched), 400);
  const draft = useMemo(() => JSON.parse(draftJson) as Partial<FormIn>, [draftJson]);

  const postDraft = useCallback(() => {
    const win = iframe.current?.contentWindow;
    if (!win) return;
    const message: PreviewMessage = {
      type: PREVIEW_MESSAGE,
      theme: {
        template: draft.template ?? store.template,
        primaryColor: draft.primaryColor ?? store.primaryColor,
        secondaryColor: draft.secondaryColor ?? store.secondaryColor,
        font: draft.font ?? store.font,
        bannerTitle: draft.bannerTitle ?? null,
        bannerSubtitle: draft.bannerSubtitle ?? null,
      },
    };
    win.postMessage(message, window.location.origin);
  }, [draft, store]);

  useEffect(postDraft, [postDraft]);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin === window.location.origin && e.data?.type === PREVIEW_READY) postDraft();
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [postDraft]);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const updated = await update.mutateAsync(values);
      reset(toValues(updated));
      toast.success('تم حفظ التصميم');
      // Give the storefront a moment to revalidate, then reload with saved images.
      setTimeout(() => setFrameKey((k) => k + 1), 700);
    } catch (err) {
      if (!applyServerErrors(err, setError)) setFormError(getErrorMessage(err));
    }
  });

  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-md bg-n-100 p-1 lg:hidden" role="tablist">
        {(
          [
            ['controls', 'الإعدادات', SlidersHorizontal],
            ['preview', 'معاينة', Eye],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={mobileView === key}
            onClick={() => setMobileView(key)}
            className={cn(
              'flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-sm text-sm font-semibold',
              mobileView === key ? 'bg-n-0 text-n-900 shadow-sm' : 'text-n-600',
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
        <form onSubmit={onSubmit} noValidate className={cn('flex flex-col gap-4', mobileView === 'preview' && 'hidden lg:flex')}>
          <FormError message={formError} />

          <Card className="flex flex-col gap-3 p-4">
            <h2 className="font-bold">القالب</h2>
            <Controller
              control={control}
              name="template"
              render={({ field }) => <TemplatePicker value={field.value ?? 'classic'} onChange={field.onChange} brand={watched.primaryColor ?? store.primaryColor} />}
            />
          </Card>

          <Card className="flex flex-col gap-4 p-4">
            <h2 className="font-bold">الألوان والخط</h2>
            <Controller
              control={control}
              name="primaryColor"
              render={({ field }) => <ColorField label="اللون الأساسي" value={field.value ?? ''} onChange={field.onChange} error={errors.primaryColor?.message} />}
            />
            <Controller
              control={control}
              name="secondaryColor"
              render={({ field }) => (
                <ColorField label="اللون الثانوي (الشارات والعروض)" value={field.value ?? ''} onChange={field.onChange} error={errors.secondaryColor?.message} />
              )}
            />
            <fieldset>
              <legend className="mb-1.5 text-sm font-semibold text-n-800">الخط</legend>
              <div className="grid grid-cols-3 gap-2">
                {STORE_FONTS.map((f) => (
                  <label
                    key={f}
                    className="flex min-h-11 cursor-pointer items-center justify-center rounded-md border-2 border-n-200 px-2 text-center text-sm font-semibold has-checked:border-brand-600 has-checked:bg-brand-50"
                  >
                    <input type="radio" value={f} className="sr-only" {...register('font')} />
                    {STORE_FONT_LABELS[f].split(' ')[0]}
                  </label>
                ))}
              </div>
            </fieldset>
          </Card>

          <Card className="flex flex-col gap-4 p-4">
            <h2 className="font-bold">الشعار والغلاف</h2>
            <Controller control={control} name="logoUrl" render={({ field }) => <ImageUpload label="الشعار" value={field.value} onChange={field.onChange} />} />
            <Controller
              control={control}
              name="bannerUrl"
              render={({ field }) => <ImageUpload label="صورة الغلاف (يُفضّل 1200×400)" aspect="wide" value={field.value} onChange={field.onChange} />}
            />
            <Field label="عنوان الغلاف" optional error={errors.bannerTitle?.message}>
              <Input placeholder="مثال: تشكيلة الخريف وصلت" {...register('bannerTitle')} />
            </Field>
            <Field label="نص فرعي" optional error={errors.bannerSubtitle?.message}>
              <Input placeholder="مثال: التوصيل مجاني فوق 200,000 ل.س" {...register('bannerSubtitle')} />
            </Field>
            <Controller
              control={control}
              name="faviconUrl"
              render={({ field }) => <ImageUpload label="أيقونة المتصفح (اختياري)" value={field.value} onChange={field.onChange} />}
            />
            <p className="text-xs text-n-600">الألوان والقالب والنصوص تظهر فوراً في المعاينة. الصور تظهر بعد الحفظ.</p>
          </Card>

          <div className="sticky bottom-20 z-10 lg:bottom-4">
            <Button type="submit" size="lg" block className="shadow-lg" loading={isSubmitting} disabled={!isDirty}>
              حفظ التصميم
            </Button>
          </div>
        </form>

        <div className={cn('flex flex-col gap-3 lg:sticky lg:top-8 lg:h-[calc(100dvh-4rem)]', mobileView === 'controls' && 'hidden lg:flex')}>
          <div className="flex items-center justify-between gap-2">
            <div className="hidden gap-1 rounded-md bg-n-100 p-1 lg:flex">
              <Button variant="ghost" size="icon" aria-pressed={device === 'mobile'} aria-label="معاينة موبايل" className={cn(device === 'mobile' && 'bg-n-0 shadow-sm')} onClick={() => setDevice('mobile')}>
                <Smartphone aria-hidden />
              </Button>
              <Button variant="ghost" size="icon" aria-pressed={device === 'desktop'} aria-label="معاينة كمبيوتر" className={cn(device === 'desktop' && 'bg-n-0 shadow-sm')} onClick={() => setDevice('desktop')}>
                <Monitor aria-hidden />
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setFrameKey((k) => k + 1)}>
              <RotateCw aria-hidden />
              تحديث المعاينة
            </Button>
          </div>
          <div className="flex flex-1 items-start justify-center overflow-hidden rounded-xl border border-n-200 bg-n-100 p-2 lg:p-4">
            <iframe
              key={frameKey}
              ref={iframe}
              title="معاينة المتجر"
              src={`/s/${store.slug}?preview=1`}
              onLoad={postDraft}
              className={cn(
                'h-[70dvh] rounded-lg border border-n-200 bg-n-0 shadow-sm lg:h-full',
                device === 'mobile' ? 'w-full max-w-[390px]' : 'w-full',
              )}
            />
          </div>
        </div>
      </div>
    </>
  );
}

export default function DesignPage() {
  const store = useStore();
  return (
    <>
      <PageHeader title="تصميم المتجر" description="غيّر الشكل وشاهد النتيجة مباشرة" />
      {store ? <DesignEditor key={store.id} store={store} /> : <Spinner />}
    </>
  );
}
