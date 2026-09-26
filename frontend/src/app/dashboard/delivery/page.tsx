'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { deliveryZoneInputSchema, formatMoney, type DeliveryZoneDto } from '@matjari/shared';
import { Clock, Info, Pencil, Plus, Trash2, Truck } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';
import { FormError } from '@/components/auth-card';
import { Button } from '@/components/ui/button';
import { ConfirmDialog, Dialog, DialogContent } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { EmptyState, PageHeader, Skeleton } from '@/components/ui/misc';
import { MoneyInput } from '@/components/ui/money-input';
import { getErrorMessage } from '@/lib/api';
import { useMe } from '@/lib/auth';
import { useZoneMutations, useZones } from '@/lib/queries';

type FormIn = z.input<typeof deliveryZoneInputSchema>;
type FormOut = z.output<typeof deliveryZoneInputSchema>;

function ZoneDialog({
  zone,
  open,
  onOpenChange,
  currency,
}: {
  zone: DeliveryZoneDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency: string;
}) {
  const { create, update } = useZoneMutations();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(deliveryZoneInputSchema),
    values: { name: zone?.name ?? '', fee: zone?.fee ?? 0, estimatedTime: zone?.estimatedTime ?? '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      if (zone) await update.mutateAsync({ id: zone.id, ...values });
      else await create.mutateAsync(values);
      toast.success(zone ? 'تم تحديث المنطقة' : 'تمت إضافة المنطقة');
      onOpenChange(false);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={zone ? 'تعديل منطقة التوصيل' : 'منطقة توصيل جديدة'} sheet>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <FormError message={error} />
          <Field label="اسم المنطقة" error={errors.name?.message}>
            <Input placeholder="مثال: دمشق — المزة" {...register('name')} />
          </Field>
          <Controller
            control={control}
            name="fee"
            render={({ field }) => (
              <Field label="رسوم التوصيل" error={errors.fee?.message} hint="اكتب 0 للتوصيل المجاني">
                <MoneyInput currency={currency} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />
              </Field>
            )}
          />
          <Field label="مدة التوصيل المتوقعة" optional error={errors.estimatedTime?.message}>
            <Input placeholder="مثال: خلال 24 ساعة" {...register('estimatedTime')} />
          </Field>
          <Button type="submit" block size="lg" loading={isSubmitting}>
            حفظ
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function DeliveryPage() {
  const currency = useMe().data?.store?.currency ?? 'SYP';
  const { data, isPending } = useZones();
  const { remove } = useZoneMutations();
  const [editing, setEditing] = useState<DeliveryZoneDto | null>(null);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<DeliveryZoneDto | null>(null);

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }

  return (
    <>
      <PageHeader
        title="مناطق التوصيل"
        description="الزبون يختار منطقته عند الطلب، وتُضاف رسومها تلقائياً للإجمالي."
        actions={
          <Button onClick={openCreate}>
            <Plus aria-hidden />
            منطقة جديدة
          </Button>
        }
      />

      {isPending ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 2 }, (_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : !data?.length ? (
        <EmptyState
          icon={<Truck />}
          title="أضف أول منطقة توصيل"
          description="بدون مناطق، لن تُحسب رسوم توصيل ولن يُطلب من الزبون اختيار منطقة."
          action={
            <Button onClick={openCreate}>
              <Plus aria-hidden />
              أضف منطقة
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {data.map((z) => (
            <li key={z.id} className="flex items-center gap-3 rounded-lg border border-n-200 bg-n-0 p-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-700">
                <Truck className="size-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{z.name}</p>
                <p className="text-sm font-bold text-n-900">{z.fee === 0 ? 'توصيل مجاني' : formatMoney(z.fee, currency)}</p>
                {z.estimatedTime && (
                  <p className="flex items-center gap-1 text-xs text-n-600">
                    <Clock className="size-3.5" aria-hidden />
                    {z.estimatedTime}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`تعديل ${z.name}`}
                onClick={() => {
                  setEditing(z);
                  setOpen(true);
                }}
              >
                <Pencil aria-hidden />
              </Button>
              <Button variant="danger-ghost" size="icon" aria-label={`حذف ${z.name}`} onClick={() => setDeleting(z)}>
                <Trash2 aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 flex items-start gap-1.5 text-xs text-n-600">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        تعديل أو حذف منطقة لا يغيّر الطلبات السابقة — اسم المنطقة ورسومها محفوظان مع كل طلب.
      </p>

      <ZoneDialog zone={editing} open={open} onOpenChange={setOpen} currency={currency} />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`حذف «${deleting?.name ?? ''}»؟`}
        description="لن تظهر هذه المنطقة للزبائن بعد الآن."
        confirmLabel="حذف"
        destructive
        loading={remove.isPending}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await remove.mutateAsync(deleting.id);
            toast.success('تم حذف المنطقة');
            setDeleting(null);
          } catch (err) {
            toast.error(getErrorMessage(err));
          }
        }}
      />
    </>
  );
}
