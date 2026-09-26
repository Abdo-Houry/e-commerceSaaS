import { cn } from '@/lib/utils';

export function discountPercent(price: number, comparePrice: number | null): number {
  return comparePrice && comparePrice > price ? Math.round((1 - price / comparePrice) * 100) : 0;
}

/**
 * Shown when the merchant sets «السعر قبل الخصم». Always the same sale red,
 * independent of the store's theme colours, so shoppers read it as a discount.
 */
export function DiscountBadge({ percent, className }: { percent: number; className?: string }) {
  if (percent <= 0) return null;
  return (
    <span className={cn('inline-flex items-center rounded-full bg-[#DC2626] px-2.5 py-0.5 text-caption font-bold text-n-0 shadow-sm', className)}>
      خصم {percent}%
    </span>
  );
}

/** Availability line for customers. `stock` is only meaningful when the product tracks stock. */
export function StockNote({ trackStock, stock, inStock, compact }: { trackStock: boolean; stock: number; inStock: boolean; compact?: boolean }) {
  if (!inStock) return <span className="text-xs font-semibold text-[#B91C1C]">نفد المخزون</span>;
  if (!trackStock) return compact ? null : <span className="text-sm font-semibold text-status-delivered-fg">متوفر</span>;
  const low = stock <= 5;
  if (compact) return low ? <span className="text-xs font-semibold text-[#B45309]">باقي {stock} فقط</span> : null;
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-sm font-semibold', low ? 'text-[#B45309]' : 'text-status-delivered-fg')}>
      <span className={cn('size-2 rounded-full', low ? 'bg-accent-500' : 'bg-success')} aria-hidden />
      {low ? `باقي ${stock} ${stock === 1 ? 'قطعة' : 'قطع'} فقط` : `متوفر: ${stock} قطعة`}
    </span>
  );
}
