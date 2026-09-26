import { cn } from '@/lib/utils';

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-lg border border-n-200 bg-n-0', className)} {...props} />;
}

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden className={cn('animate-pulse rounded-md bg-n-200/70', className)} {...props} />;
}

export function Badge({
  className,
  tone = 'neutral',
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: 'neutral' | 'brand' | 'accent' | 'danger' | 'info' }) {
  const tones = {
    neutral: 'bg-n-100 text-n-700',
    brand: 'bg-brand-100 text-brand-700',
    accent: 'bg-accent-100 text-[#B45309]',
    danger: 'bg-status-cancelled-bg text-status-cancelled-fg',
    info: 'bg-status-new-bg text-status-new-fg',
  };
  return (
    <span
      className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-caption font-semibold whitespace-nowrap', tones[tone], className)}
      {...props}
    />
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center gap-3 rounded-lg border border-dashed border-n-300 bg-n-0 px-6 py-12 text-center', className)}>
      <div className="flex size-14 items-center justify-center rounded-full bg-brand-50 text-brand-700 [&_svg]:size-7">{icon}</div>
      <h3 className="text-h3 font-bold text-n-900">{title}</h3>
      {description && <p className="max-w-sm text-sm text-n-600">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-6 flex flex-wrap items-end justify-between gap-3', className)}>
      <div className="min-w-0">
        <h1 className="text-h2 font-bold text-n-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-n-600">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="جاري التحميل"
      className={cn('inline-block size-6 animate-spin rounded-full border-3 border-n-200 border-t-brand-600', className)}
    />
  );
}
