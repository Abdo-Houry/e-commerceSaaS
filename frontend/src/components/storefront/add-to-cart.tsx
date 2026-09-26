'use client';

import type { PublicProductDto } from '@matjari/shared';
import { Check, ShoppingBag } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { QuantityStepper } from './cart-widgets';
import { useCart } from './storefront-context';

export function AddToCart({ product }: { product: PublicProductDto }) {
  const { add, store } = useCart();
  const router = useRouter();
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [missing, setMissing] = useState<string[]>([]);
  const [added, setAdded] = useState(false);
  const maxQuantity = product.trackStock ? product.stock : null;

  function addToCart(): boolean {
    const unset = product.options.filter((o) => !selected[o.name]).map((o) => o.name);
    setMissing(unset);
    if (unset.length) return false;
    add({
      productId: product.id,
      name: product.name,
      price: product.price,
      image: product.images[0] ?? null,
      quantity,
      options: selected,
      maxQuantity,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
    return true;
  }

  if (!product.inStock) {
    return <p className="rounded-md bg-status-cancelled-bg px-4 py-3 text-center font-semibold text-status-cancelled-fg">نفد المخزون حالياً</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      {product.options.map((option) => {
        const error = missing.includes(option.name);
        return (
          <fieldset key={option.name} aria-describedby={error ? `err-${option.name}` : undefined}>
            <legend className="mb-2 text-sm font-bold text-n-900">
              {option.name}
              {selected[option.name] && <span className="ms-2 font-normal text-n-600">{selected[option.name]}</span>}
            </legend>
            <div className="flex flex-wrap gap-2">
              {option.values.map((value) => {
                const active = selected[option.name] === value;
                return (
                  <label
                    key={value}
                    className={cn(
                      'flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-md border-2 px-4 text-sm font-semibold transition-colors',
                      active ? 'border-store bg-store-soft text-n-900' : 'border-n-200 bg-n-0 text-n-800 hover:border-n-300',
                    )}
                  >
                    <input
                      type="radio"
                      name={option.name}
                      value={value}
                      checked={active}
                      onChange={() => {
                        setSelected((s) => ({ ...s, [option.name]: value }));
                        setMissing((m) => m.filter((n) => n !== option.name));
                      }}
                      className="sr-only"
                    />
                    {value}
                  </label>
                );
              })}
            </div>
            {error && (
              <p id={`err-${option.name}`} role="alert" className="mt-1.5 text-xs font-medium text-[#B91C1C]">
                اختر {option.name}
              </p>
            )}
          </fieldset>
        );
      })}

      <div className="flex items-center gap-3">
        <span className="text-sm font-bold text-n-900">الكمية</span>
        <QuantityStepper value={quantity} onChange={setQuantity} max={maxQuantity} label="الكمية" />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={addToCart}
          className={cn(
            'flex min-h-13 flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border-2 border-store-strong px-5 font-bold transition-colors',
            added ? 'border-success bg-success text-n-0' : 'bg-n-0 text-store-strong hover:bg-store-soft',
          )}
        >
          {added ? <Check className="size-5" aria-hidden /> : <ShoppingBag className="size-5" aria-hidden />}
          {added ? 'أضيف إلى السلة' : 'أضف إلى السلة'}
        </button>
        <button
          type="button"
          onClick={() => {
            if (addToCart()) router.push(`/s/${store.slug}/cart`);
          }}
          className="flex min-h-13 flex-1 cursor-pointer items-center justify-center rounded-md bg-store-strong px-5 font-bold text-n-0 hover:opacity-90"
        >
          اطلب الآن
        </button>
      </div>
      <p className="sr-only" aria-live="polite">
        {added ? 'تمت الإضافة إلى السلة' : ''}
      </p>
    </div>
  );
}
