import { ORDER_STATUS_LABELS, type OrderStatus } from '@matjari/shared';
import { cn } from '@/lib/utils';

const styles: Record<OrderStatus | 'incomplete', string> = {
  new: 'bg-status-new-bg text-status-new-fg',
  preparing: 'bg-status-preparing-bg text-status-preparing-fg',
  shipped: 'bg-status-shipped-bg text-status-shipped-fg',
  delivered: 'bg-status-delivered-bg text-status-delivered-fg',
  cancelled: 'bg-status-cancelled-bg text-status-cancelled-fg',
  incomplete: 'bg-status-incomplete-bg text-status-incomplete-fg ring-1 ring-n-300',
};

export function StatusBadge({ status, className }: { status: OrderStatus | 'incomplete'; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-caption font-semibold whitespace-nowrap',
        styles[status],
        className,
      )}
    >
      {status === 'incomplete' ? 'غير مكتمل' : ORDER_STATUS_LABELS[status]}
    </span>
  );
}
