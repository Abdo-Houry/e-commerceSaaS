'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  imageUrlSchema,
  MAX_PRODUCT_IMAGES,
  optionalText,
  requiredText,
  type ProductDto,
  type ProductInput,
} from '@matjari/shared';
import { Plus, Trash2 } from 'lucide-react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { FormError } from '@/components/auth-card';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { ImagesManager } from '@/components/ui/image-upload';
import { Input, NativeSelect, Textarea } from '@/components/ui/input';
import { Card } from '@/components/ui/misc';
import { MoneyInput } from '@/components/ui/money-input';
import { Switch } from '@/components/ui/switch';
import { useCategories } from '@/lib/queries';

const splitValues = (s: string) => [...new Set(s.split(/[,،]/).map((v) => v.trim()).filter(Boolean))];

const formSchema = z
  .object({
    name: requiredText(120, 'اسم المنتج'),
    description: optionalText(2000),
    price: z.number({ error: 'السعر مطلوب' }).int().min(0, 'لا يمكن أن يكون سالباً'),
    comparePrice: z.number().int().min(0).nullable(),
    categoryId: z.string().nullable(),
    images: z.array(imageUrlSchema).max(MAX_PRODUCT_IMAGES),
    stock: z.number({ error: 'أدخل رقماً' }).int('أدخل رقماً صحيحاً').min(0, 'لا يمكن أن يكون سالباً').max(1_000_000),
    trackStock: z.boolean(),
    isActive: z.boolean(),
    options: z
      .array(
        z.object({
          name: requiredText(40, 'اسم الخيار'),
          values: z
            .string()
            .transform(splitValues)
            .pipe(z.array(z.string().max(40, 'قيمة طويلة جداً')).min(1, 'أضف قيمة واحدة على الأقل').max(20, 'الحد الأقصى 20 قيمة')),
        }),
      )
      .max(5, 'الحد الأقصى 5 خيارات')
      .refine((o) => new Set(o.map((x) => x.name.trim())).size === o.length, 'أسماء الخيارات مكررة'),
  })
  .refine((v) => v.comparePrice == null || v.comparePrice > v.price, {
    message: 'السعر قبل الخصم يجب أن يكون أكبر من السعر الحالي',
    path: ['comparePrice'],
  });

type FormIn = z.input<typeof formSchema>;
type FormOut = z.output<typeof formSchema>;

function toFormValues(p?: ProductDto): FormIn {
  return {
    name: p?.name ?? '',
    description: p?.description ?? '',
    price: p?.price ?? (null as unknown as number),
    comparePrice: p?.comparePrice ?? null,
    categoryId: p?.categoryId ?? null,
    images: p?.images ?? [],
    stock: p?.stock ?? 0,
    trackStock: p?.trackStock ?? true,
    isActive: p?.isActive ?? true,
    options: (p?.options ?? []).map((o) => ({ name: o.name, values: o.values.join('، ') })),
  };
}

export function ProductForm({
  product,
  currency,
  submitLabel,
  onSubmit,
  error,
  footer,
}: {
  product?: ProductDto;
  currency: string;
  submitLabel: string;
  onSubmit: (values: ProductInput) => Promise<void>;
  error: string | null;
  footer?: React.ReactNode;
}) {
  const categories = useCategories();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(formSchema),
    defaultValues: toFormValues(product),
  });
  const options = useFieldArray({ control, name: 'options' });
  const trackStock = useWatch({ control, name: 'trackStock' });

  const submit = handleSubmit((v) =>
    onSubmit({
      ...v,
      categoryId: v.categoryId || null,
      options: v.options.map((o) => ({ name: o.name.trim(), values: o.values })),
    }),
  );

  return (
    <form onSubmit={submit} noValidate className="grid gap-4 lg:grid-cols-3">
      <div className="flex flex-col gap-4 lg:col-span-2">
        <FormError message={error} />

        <Card className="flex flex-col gap-4 p-4">
          <Field label="اسم المنتج" error={errors.name?.message}>
            <Input placeholder="مثال: قميص قطني" {...register('name')} />
          </Field>
          <Field label="الوصف" optional error={errors.description?.message}>
            <Textarea rows={4} placeholder="المواد، المقاسات، طريقة الاستخدام…" {...register('description')} />
          </Field>
        </Card>

        <Card className="p-4">
          <Controller
            control={control}
            name="images"
            render={({ field }) => <ImagesManager value={field.value} onChange={field.onChange} />}
          />
        </Card>

        <Card className="grid gap-4 p-4 sm:grid-cols-2">
          <Controller
            control={control}
            name="price"
            render={({ field }) => (
              <Field label="السعر" error={errors.price?.message}>
                <MoneyInput currency={currency} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />
              </Field>
            )}
          />
          <Controller
            control={control}
            name="comparePrice"
            render={({ field }) => (
              <Field label="السعر قبل الخصم" optional error={errors.comparePrice?.message} hint="يظهر مشطوباً بجانب السعر">
                <MoneyInput currency={currency} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />
              </Field>
            )}
          />
        </Card>

        <Card className="flex flex-col gap-3 p-4">
          <div>
            <h2 className="font-bold">الخيارات</h2>
            <p className="text-xs text-n-600">مثل المقاس أو اللون. الزبون يختار قيمة من كل خيار قبل الإضافة للسلة.</p>
          </div>
          {options.fields.map((f, i) => (
            <div key={f.id} className="grid gap-2 rounded-md border border-n-200 p-3 sm:grid-cols-[1fr_2fr_auto]">
              <Field label="اسم الخيار" error={errors.options?.[i]?.name?.message}>
                <Input placeholder="المقاس" {...register(`options.${i}.name`)} />
              </Field>
              <Field label="القيم (مفصولة بفاصلة)" error={errors.options?.[i]?.values?.message}>
                <Input placeholder="S، M، L، XL" {...register(`options.${i}.values`)} />
              </Field>
              <Button variant="danger-ghost" size="icon" className="self-end" aria-label={`حذف الخيار ${i + 1}`} onClick={() => options.remove(i)}>
                <Trash2 aria-hidden />
              </Button>
            </div>
          ))}
          {errors.options?.root?.message && <p className="text-xs font-medium text-[#B91C1C]">{errors.options.root.message}</p>}
          {errors.options?.message && <p className="text-xs font-medium text-[#B91C1C]">{errors.options.message}</p>}
          {options.fields.length < 5 && (
            <Button variant="secondary" size="sm" className="w-fit" onClick={() => options.append({ name: '', values: '' })}>
              <Plus aria-hidden />
              إضافة خيار
            </Button>
          )}
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <Card className="flex flex-col gap-2 p-4">
          <Controller
            control={control}
            name="isActive"
            render={({ field }) => (
              <Switch checked={field.value} onCheckedChange={field.onChange} label="ظاهر في المتجر" description="أخفِ المنتج مؤقتاً بدون حذفه" />
            )}
          />
        </Card>

        <Card className="flex flex-col gap-4 p-4">
          <Field label="التصنيف" select error={errors.categoryId?.message}>
            <NativeSelect {...register('categoryId', { setValueAs: (v: string) => v || null })} disabled={categories.isPending}>
              <option value="">بدون تصنيف</option>
              {categories.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </Card>

        <Card className="flex flex-col gap-3 p-4">
          <Controller
            control={control}
            name="trackStock"
            render={({ field }) => (
              <Switch checked={field.value} onCheckedChange={field.onChange} label="تتبع المخزون" description="يمنع الطلب عند نفاد الكمية" />
            )}
          />
          {trackStock && (
            <Field label="الكمية المتوفرة" error={errors.stock?.message}>
              <Input type="number" inputMode="numeric" min={0} dir="ltr" className="text-end" {...register('stock', { valueAsNumber: true })} />
            </Field>
          )}
        </Card>

        <div className="sticky bottom-20 z-10 flex flex-col gap-2 lg:static">
          <Button type="submit" size="lg" block loading={isSubmitting} disabled={!!product && !isDirty}>
            {submitLabel}
          </Button>
          {footer}
        </div>
      </div>
    </form>
  );
}
