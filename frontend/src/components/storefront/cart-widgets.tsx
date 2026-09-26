'use client';

import { formatMoney } from '@matjari/shared';
import { Check, Minus, Plus, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useCart } from './storefront-context';

export function CartLink() {
  const { store, count, ready } = useCart();
  return (
    <Link
      href={`/s/${store.slug}/cart`}
      className="relative flex size-11 items-center justify-center rounded-full text-n-800 hover:bg-n-100"
      aria-label={ready && count ? `السلة، ${count} منتجات` : 'السلة'}
    >
      <ShoppingBag className="size-6" aria-hidden />
      {ready && count > 0 && (
        <span className="absolute top-0.5 end-0.5 flex min-w-5 items-center justify-center rounded-full bg-store-strong px-1 text-caption font-bold text-n-0">
          {count}
        </span>
      )}
    </Link>
  );
}

/** Sticky bottom bar on phones once the cart has something in it. */
export function CartBar() {
  const { store, count, subtotal, ready } = useCart();
  const pathname = usePathname();
  const hidden = /\/(cart|checkout|thank-you)(\/|$)/.test(pathname);
  if (!ready || count === 0 || hidden) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 px-4 pb-safe md:hidden">
      <Link
        href={`/s/${store.slug}/cart`}
        className="mb-3 flex min-h-14 items-center justify-between gap-3 rounded-lg bg-store-strong px-4 text-n-0 shadow-xl"
      >
        <span className="flex items-center gap-2 font-semibold">
          <ShoppingBag className="size-5" aria-hidden />
          عرض السلة ({count})
        </span>
        <span className="font-bold">{formatMoney(subtotal, store.currency)}</span>
      </Link>
    </div>
  );
}

export function QuantityStepper({
  value,
  onChange,
  max,
  label,
  size = 'md',
}: {
  value: number;
  onChange: (v: number) => void;
  max: number | null;
  label: string;
  size?: 'sm' | 'md';
}) {
  const limit = Math.min(max ?? 99, 99);
  const btn = cn(
    'flex cursor-pointer items-center justify-center text-n-800 hover:bg-n-100 disabled:cursor-not-allowed disabled:opacity-40',
    size === 'sm' ? 'size-11' : 'size-12',
  );
  return (
    <div className="inline-flex items-center rounded-md border border-n-300 bg-n-0" role="group" aria-label={label}>
      <button type="button" className={btn} aria-label="زيادة الكمية" disabled={value >= limit} onClick={() => onChange(value + 1)}>
        <Plus className="size-4" aria-hidden />
      </button>
      <span className="min-w-8 text-center font-bold tabular-nums" aria-live="polite">
        {value}
      </span>
      <button type="button" className={btn} aria-label="إنقاص الكمية" disabled={value <= 1} onClick={() => onChange(value - 1)}>
        <Minus className="size-4" aria-hidden />
      </button>
    </div>
  );
}

/** One-tap add for products without options. */
export function QuickAdd({
  product,
}: {
  product: { id: string; name: string; price: number; image: string | null; maxQuantity: number | null };
}) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 1500);
    return () => clearTimeout(t);
  }, [added]);

  return (
    <button
      type="button"
      onClick={() => {
        add({ productId: product.id, name: product.name, price: product.price, image: product.image, quantity: 1, options: {}, maxQuantity: product.maxQuantity });
        setAdded(true);
      }}
      aria-label={added ? `تمت إضافة ${product.name}` : `أضف ${product.name} إلى السلة`}
      className={cn(
        'flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-n-0 transition-transform active:scale-95',
        added ? 'bg-success' : 'bg-store-strong',
      )}
    >
      {added ? <Check className="size-5" aria-hidden /> : <Plus className="size-5" aria-hidden />}
      <span className="sr-only" aria-live="polite">
        {added ? 'أضيف إلى السلة' : ''}
      </span>
    </button>
  );
}
