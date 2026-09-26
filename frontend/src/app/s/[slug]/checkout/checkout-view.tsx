'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  checkoutFormSchema,
  DEMO_STORE_SLUG,
  formatMoney,
  placeOrderThenOpenWhatsapp,
  type ApiError,
  type ApiSuccess,
  type CreatePublicOrderInput,
  type CreatePublicOrderResult,
} from '@matjari/shared';
import { ArrowRight, Loader2, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useState } from 'react';
import { useForm, useWatch, type Path } from 'react-hook-form';
import type { z } from 'zod';
import { useCart } from '@/components/storefront/storefront-context';
import { API_URL } from '@/lib/env';
import { savePlacedOrder } from '@/lib/order-session';
import { cn } from '@/lib/utils';

type FormIn = z.input<typeof checkoutFormSchema>;
type FormOut = z.output<typeof checkoutFormSchema>;

class OrderRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ApiError['error'] | null,
  ) {
    super(body?.message ?? 'تعذر إرسال الطلب');
  }
}

async function createOrder(input: CreatePublicOrderInput): Promise<CreatePublicOrderResult> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/public/orders`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    });
  } catch {
    throw new OrderRequestError(0, { code: 'NETWORK', message: 'تعذر الاتصال. تحقق من الإنترنت وحاول مجدداً.' });
  }
  const body = (await res.json().catch(() => null)) as ApiSuccess<CreatePublicOrderResult> | ApiError | null;
  if (!res.ok || !body || !('data' in body)) {
    throw new OrderRequestError(res.status, body && 'error' in body ? body.error : null);
  }
  return body.data;
}

const inputClass =
  'min-h-12 w-full rounded-md border border-n-300 bg-n-0 px-4 text-body-lg text-n-900 placeholder:text-n-500 focus:border-store focus:ring-3 focus:ring-store-soft focus:outline-none aria-invalid:border-danger';

function FormField({
  label,
  error,
  optional,
  hint,
  children,
}: {
  label: string;
  error?: string;
  optional?: boolean;
  hint?: string;
  children: (props: { id: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }) => React.ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-bold text-n-900">
        {label}
        {optional && <span className="ms-1 font-normal text-n-600">(اختياري)</span>}
      </label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': error ? `${id}-e` : hint ? `${id}-h` : undefined })}
      {hint && !error && (
        <p id={`${id}-h`} className="text-xs text-n-600">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-e`} role="alert" className="text-xs font-medium text-[#B91C1C]">
          {error}
        </p>
      )}
    </div>
  );
}

export function CheckoutView() {
  const router = useRouter();
  const { store, items, ready, subtotal, clear, reconcile } = useCart();
  const [formError, setFormError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const zones = store.deliveryZones;

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: { customerName: '', customerPhone: '', zoneId: zones.length === 1 ? zones[0]!.id : null, customerAddress: '', notes: '' },
  });
  const zoneId = useWatch({ control, name: 'zoneId' });
  const zone = zones.find((z) => z.id === zoneId);
  const deliveryFee = zone?.fee ?? 0;

  useEffect(() => {
    if (ready && items.length === 0 && !redirecting) router.replace(`/s/${store.slug}/cart`);
  }, [ready, items.length, redirecting, router, store.slug]);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    if (zones.length > 0 && !values.zoneId) {
      setError('zoneId', { message: 'اختر منطقة التوصيل' }, { shouldFocus: true });
      return;
    }

    const input: CreatePublicOrderInput = {
      slug: store.slug,
      // Only ids, quantities and options are sent — prices are always computed by the server.
      items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, selectedOptions: i.options })),
      ...values,
    };

    try {
      // Order row first, then WhatsApp. See placeOrderThenOpenWhatsapp.
      await placeOrderThenOpenWhatsapp(input, {
        createOrder: async (payload) => {
          const order = await createOrder(payload);
          savePlacedOrder(store.slug, {
            id: order.id,
            orderNumber: order.orderNumber,
            whatsappUrl: order.whatsappUrl,
            total: order.total,
            currency: order.currency,
          });
          return order;
        },
        onCreated: (order) => {
          setRedirecting(true);
          clear();
          router.push(`/s/${store.slug}/thank-you/${order.orderNumber}`);
        },
        markWhatsappOpened: (orderId) => {
          void fetch(`${API_URL}/public/orders/${orderId}/whatsapp-opened`, { method: 'PATCH', keepalive: true }).catch(() => {});
        },
        openWhatsapp: (url) => {
          window.location.href = url;
        },
      });
    } catch (err) {
      if (!(err instanceof OrderRequestError)) {
        setFormError('حدث خطأ غير متوقع، حاول مرة أخرى');
        return;
      }
      const e = err.body;
      if (e?.code === 'VALIDATION_ERROR' && e.details && typeof e.details === 'object') {
        let applied = false;
        for (const [field, messages] of Object.entries(e.details as Record<string, string[]>)) {
          if (field in values && messages?.[0]) {
            setError(field as Path<FormIn>, { message: messages[0] });
            applied = true;
          }
        }
        if (!applied) setFormError(e.message);
      } else if (e?.code === 'ZONE_REQUIRED' || e?.code === 'INVALID_ZONE') {
        setError('zoneId', { message: e.message }, { shouldFocus: true });
      } else if (e?.code === 'OUT_OF_STOCK' || e?.code === 'PRODUCT_UNAVAILABLE' || e?.code === 'INVALID_OPTIONS') {
        setFormError(`${e.message}. راجع السلة ثم حاول مجدداً.`);
        void reconcile();
      } else {
        setFormError(err.message);
      }
    }
  });

  if (!ready || items.length === 0) {
    return (
      <main className="flex min-h-[50dvh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-store" aria-label="جاري التحميل" />
      </main>
    );
  }

  const busy = isSubmitting || redirecting;

  return (
    <main className="mx-auto max-w-5xl px-4 pt-4">
      <Link href={`/s/${store.slug}/cart`} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-n-700 hover:text-n-900">
        <ArrowRight className="size-4" aria-hidden />
        السلة
      </Link>
      <h1 className="mt-1 text-h2 font-bold text-n-900">إتمام الطلب</h1>

      <form onSubmit={onSubmit} noValidate className="mt-4 grid gap-4 md:grid-cols-[1fr_360px] md:items-start">
        <div className="flex flex-col gap-4">
          <section aria-labelledby="customer-h" className="flex flex-col gap-4 rounded-lg border border-n-200 bg-n-0 p-4">
            <h2 id="customer-h" className="font-bold text-n-900">
              معلوماتك
            </h2>
            <FormField label="الاسم الكامل" error={errors.customerName?.message}>
              {(p) => <input {...p} autoComplete="name" className={inputClass} {...register('customerName')} />}
            </FormField>
            <FormField label="رقم الهاتف" error={errors.customerPhone?.message} hint="سيتواصل معك المتجر على هذا الرقم">
              {(p) => (
                <input {...p} type="tel" dir="ltr" inputMode="tel" autoComplete="tel" placeholder="09XX XXX XXX" className={cn(inputClass, 'text-end')} {...register('customerPhone')} />
              )}
            </FormField>
          </section>

          <section aria-labelledby="delivery-h" className="flex flex-col gap-4 rounded-lg border border-n-200 bg-n-0 p-4">
            <h2 id="delivery-h" className="font-bold text-n-900">
              التوصيل
            </h2>
            {zones.length > 0 && (
              <fieldset aria-describedby={errors.zoneId ? 'zone-error' : undefined}>
                <legend className="mb-2 text-sm font-bold text-n-900">منطقة التوصيل</legend>
                <div className="flex flex-col gap-2">
                  {zones.map((z) => (
                    <label
                      key={z.id}
                      className={cn(
                        'flex min-h-14 cursor-pointer items-center gap-3 rounded-md border-2 px-3 py-2 transition-colors',
                        zoneId === z.id ? 'border-store bg-store-soft' : 'border-n-200 hover:border-n-300',
                      )}
                    >
                      <input type="radio" value={z.id} className="size-5 accent-(--brand-strong)" {...register('zoneId')} />
                      <span className="flex flex-1 flex-col">
                        <span className="font-semibold text-n-900">{z.name}</span>
                        {z.estimatedTime && <span className="text-xs text-n-600">{z.estimatedTime}</span>}
                      </span>
                      <span className="text-sm font-bold whitespace-nowrap">{z.fee === 0 ? 'مجاني' : formatMoney(z.fee, store.currency)}</span>
                    </label>
                  ))}
                </div>
                {errors.zoneId && (
                  <p id="zone-error" role="alert" className="mt-1.5 text-xs font-medium text-[#B91C1C]">
                    {errors.zoneId.message}
                  </p>
                )}
              </fieldset>
            )}
            <FormField label="العنوان بالتفصيل" error={errors.customerAddress?.message}>
              {(p) => (
                <textarea {...p} rows={3} autoComplete="street-address" placeholder="الحي، الشارع، البناء، الطابق، علامة مميزة" className={cn(inputClass, 'min-h-24 py-3')} {...register('customerAddress')} />
              )}
            </FormField>
            <FormField label="ملاحظات" optional error={errors.notes?.message}>
              {(p) => <textarea {...p} rows={2} placeholder="مثال: الاتصال قبل الوصول" className={cn(inputClass, 'min-h-20 py-3')} {...register('notes')} />}
            </FormField>
          </section>
        </div>

        <section aria-labelledby="summary-h" className="flex flex-col gap-3 rounded-lg border border-n-200 bg-n-0 p-4 md:sticky md:top-20">
          <h2 id="summary-h" className="font-bold text-n-900">
            ملخص الطلب
          </h2>
          <ul className="flex flex-col gap-2 text-sm">
            {items.map((i) => (
              <li key={i.key} className="flex justify-between gap-3">
                <span className="min-w-0 text-n-800">
                  {i.name}
                  {Object.values(i.options).length > 0 && <span className="text-n-600"> ({Object.values(i.options).join('، ')})</span>}
                  <span className="text-n-600"> × {i.quantity}</span>
                </span>
                <span className="font-semibold whitespace-nowrap">{formatMoney(i.price * i.quantity, store.currency)}</span>
              </li>
            ))}
          </ul>
          <dl className="flex flex-col gap-1 border-t border-n-200 pt-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-n-700">المجموع</dt>
              <dd>{formatMoney(subtotal, store.currency)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-n-700">التوصيل</dt>
              <dd>{zones.length === 0 ? '—' : zone ? formatMoney(deliveryFee, store.currency) : 'اختر المنطقة'}</dd>
            </div>
            <div className="mt-1 flex justify-between text-body-lg font-bold">
              <dt>الإجمالي</dt>
              <dd>{formatMoney(subtotal + deliveryFee, store.currency)}</dd>
            </div>
          </dl>

          {formError && (
            <p role="alert" className="rounded-md bg-[#FEF2F2] px-3 py-2 text-sm font-medium text-[#B91C1C]">
              {formError}
            </p>
          )}

          {store.slug === DEMO_STORE_SLUG ? (
            <div className="flex flex-col gap-2 rounded-md bg-n-900 p-4 text-center text-n-0">
              <p className="font-bold">هذا متجر تجريبي 👋</p>
              <p className="text-sm text-n-300">هنا يضغط زبونك «إرسال الطلب عبر واتساب» ويصلك الطلب مرتباً على رقمك.</p>
              <Link href="/register" className="mt-1 flex min-h-12 items-center justify-center rounded-md bg-brand-500 font-bold text-n-900 hover:bg-brand-400">
                أنشئ متجرك مجاناً
              </Link>
            </div>
          ) : (
          <button
            type="submit"
            disabled={busy}
            className="flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-md bg-whatsapp-strong px-4 text-body-lg font-bold text-n-0 hover:bg-[#0B6535] disabled:cursor-wait disabled:opacity-80"
          >
            {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <MessageCircle className="size-5" aria-hidden />}
            {busy ? 'جاري تسجيل الطلب…' : 'إرسال الطلب عبر واتساب'}
          </button>
          )}
          <p className="text-center text-xs text-n-600">سيُسجَّل طلبك برقم، ثم يُفتح واتساب برسالة جاهزة لإرسالها. الدفع عند الاستلام.</p>
        </section>
      </form>
    </main>
  );
}
