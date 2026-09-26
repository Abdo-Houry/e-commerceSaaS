'use client';

import { formatMoney } from '@matjari/shared';
import { ArrowRight, ShoppingBag, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { QuantityStepper } from '@/components/storefront/cart-widgets';
import { ProductImage } from '@/components/storefront/product-image';
import { useCart } from '@/components/storefront/storefront-context';

export function CartView() {
  const { store, items, ready, subtotal, setQuantity, remove, reconcile } = useCart();
  const [removed, setRemoved] = useState<string[]>([]);

  // Refresh prices and stock from the live catalogue once the saved cart is loaded.
  useEffect(() => {
    if (!ready) return;
    reconcile()
      .then(setRemoved)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const belowMinimum = store.minOrderAmount > 0 && subtotal < store.minOrderAmount;

  if (!ready) {
    return (
      <main className="mx-auto max-w-3xl px-4 pt-6">
        <div className="h-8 w-32 animate-pulse rounded-md bg-n-200" />
        <div className="mt-4 h-28 animate-pulse rounded-lg bg-n-200" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 pt-4">
      <Link href={`/s/${store.slug}`} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-n-700 hover:text-n-900">
        <ArrowRight className="size-4" aria-hidden />
        متابعة التسوق
      </Link>
      <h1 className="mt-1 text-h2 font-bold text-n-900">السلة</h1>

      {removed.length > 0 && (
        <p role="status" className="mt-3 rounded-md bg-accent-50 px-4 py-3 text-sm text-[#78350F]">
          أُزيلت منتجات لم تعد متوفرة: {removed.join('، ')}
        </p>
      )}

      {items.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-lg border border-dashed border-n-300 bg-n-0 px-6 py-12 text-center">
          <ShoppingBag className="size-12 text-n-400" aria-hidden />
          <p className="text-h3 font-bold text-n-900">السلة فارغة</p>
          <p className="text-sm text-n-600">تصفّح المنتجات وأضف ما يعجبك.</p>
          <Link href={`/s/${store.slug}`} className="mt-2 flex min-h-11 items-center rounded-md bg-store-strong px-5 font-bold text-n-0">
            تصفّح المنتجات
          </Link>
        </div>
      ) : (
        <>
          <ul className="mt-4 flex flex-col gap-3">
            {items.map((item) => (
              <li key={item.key} className="flex gap-3 rounded-lg border border-n-200 bg-n-0 p-3">
                <Link href={`/s/${store.slug}/product/${item.productId}`} className="shrink-0" tabIndex={-1} aria-hidden>
                  <ProductImage src={item.image} alt="" sizes="88px" className="size-22 rounded-md" />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/s/${store.slug}/product/${item.productId}`} className="line-clamp-2 font-semibold text-n-900 hover:underline">
                      {item.name}
                    </Link>
                    <button
                      type="button"
                      onClick={() => remove(item.key)}
                      aria-label={`حذف ${item.name} من السلة`}
                      className="-mt-1.5 -me-1.5 flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-n-600 hover:bg-status-cancelled-bg hover:text-[#B91C1C]"
                    >
                      <Trash2 className="size-5" aria-hidden />
                    </button>
                  </div>
                  {Object.keys(item.options).length > 0 && (
                    <p className="text-xs text-n-600">
                      {Object.entries(item.options)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(' · ')}
                    </p>
                  )}
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
                    <QuantityStepper size="sm" value={item.quantity} onChange={(q) => setQuantity(item.key, q)} max={item.maxQuantity} label={`كمية ${item.name}`} />
                    <span className="font-bold text-n-900">{formatMoney(item.price * item.quantity, store.currency)}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <section aria-label="ملخص السلة" className="mt-4 rounded-lg border border-n-200 bg-n-0 p-4">
            <div className="flex items-center justify-between text-body-lg">
              <span className="text-n-700">المجموع</span>
              <span className="font-bold">{formatMoney(subtotal, store.currency)}</span>
            </div>
            <p className="mt-1 text-xs text-n-600">رسوم التوصيل تُحسب في الخطوة التالية. الدفع عند الاستلام.</p>
            {belowMinimum && (
              <p role="alert" className="mt-3 rounded-md bg-accent-50 px-3 py-2 text-sm font-medium text-[#78350F]">
                الحد الأدنى للطلب {formatMoney(store.minOrderAmount, store.currency)} — أضف {formatMoney(store.minOrderAmount - subtotal, store.currency)} للمتابعة.
              </p>
            )}
            {belowMinimum ? (
              <span aria-disabled className="mt-4 flex min-h-13 items-center justify-center rounded-md bg-n-200 font-bold text-n-600">
                متابعة الطلب
              </span>
            ) : (
              <Link href={`/s/${store.slug}/checkout`} className="mt-4 flex min-h-13 items-center justify-center rounded-md bg-store-strong font-bold text-n-0 hover:opacity-90">
                متابعة الطلب
              </Link>
            )}
          </section>
        </>
      )}
    </main>
  );
}
