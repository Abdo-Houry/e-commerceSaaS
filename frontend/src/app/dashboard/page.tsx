'use client';

import { formatMoney, LOW_STOCK_THRESHOLD, ORDER_STATUSES } from '@matjari/shared';
import { AlertTriangle, CalendarDays, Info, PackageX, PhoneMissed, ShoppingBag, TrendingUp, Trophy } from 'lucide-react';
import Link from 'next/link';
import { OrderList, OrderListSkeleton } from '@/components/dashboard/order-list';
import { ShareStore } from '@/components/dashboard/share-store';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, PageHeader, Skeleton } from '@/components/ui/misc';
import { useMe } from '@/lib/auth';
import { useLowStock, useOrders, useOverview, useTopProducts } from '@/lib/queries';
import { assetUrl, cn } from '@/lib/utils';

function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'brand',
  href,
  loading,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  tone?: 'brand' | 'accent' | 'danger' | 'info';
  href?: string;
  loading?: boolean;
}) {
  const tones = {
    brand: 'bg-brand-50 text-brand-700',
    accent: 'bg-accent-100 text-[#B45309]',
    danger: 'bg-status-cancelled-bg text-status-cancelled-fg',
    info: 'bg-status-new-bg text-status-new-fg',
  };
  const body = (
    <Card className={cn('flex h-full flex-col gap-3 p-4', href && 'transition-colors hover:border-n-300')}>
      <span className={cn('flex size-10 items-center justify-center rounded-md', tones[tone])}>
        <Icon className="size-5" />
      </span>
      <div>
        <p className="text-xs text-n-600">{label}</p>
        {loading ? <Skeleton className="mt-1 h-7 w-24" /> : <p className="text-h3 font-bold text-n-900">{value}</p>}
      </div>
    </Card>
  );
  return href ? (
    <Link href={href} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}

export default function DashboardHome() {
  const store = useMe().data?.store;
  const currency = store?.currency ?? 'SYP';
  const overview = useOverview();
  const incomplete = useOrders({ incomplete: true, limit: 5, page: 1 });
  const top = useTopProducts(5);
  const low = useLowStock(LOW_STOCK_THRESHOLD);
  const o = overview.data;

  const trialDays = store?.subscription?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(store.subscription.trialEndsAt).getTime() - Date.now()) / 86_400_000))
    : null;

  return (
    <>
      <PageHeader title={`أهلاً ${store?.name ?? ''} 👋`} description="نظرة سريعة على متجرك اليوم" />

      {store?.subscription?.plan === 'trial' && trialDays !== null && (
        <div className="mb-4 flex items-center gap-2 rounded-md bg-brand-50 px-4 py-3 text-sm text-brand-900">
          <Info className="size-5 shrink-0 text-brand-700" aria-hidden />
          أنت في الفترة التجريبية — متبقٍ {trialDays} يوماً.
        </div>
      )}

      {store && <ShareStore slug={store.slug} />}

      <section aria-labelledby="stats-heading" className="mt-6">
        <h2 id="stats-heading" className="sr-only">
          الإحصائيات
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatCard label="مبيعات اليوم" value={formatMoney(o?.todaySales ?? 0, currency)} icon={TrendingUp} loading={overview.isPending} />
          <StatCard label="مبيعات الشهر" value={formatMoney(o?.monthSales ?? 0, currency)} icon={CalendarDays} loading={overview.isPending} />
          <StatCard label="طلبات الشهر" value={o?.monthOrders ?? 0} icon={ShoppingBag} tone="info" href="/dashboard/orders" loading={overview.isPending} />
          <StatCard
            label="طلبات غير مكتملة"
            value={o?.incompleteOrders ?? 0}
            icon={PhoneMissed}
            tone="accent"
            href="/dashboard/orders?incomplete=true"
            loading={overview.isPending}
          />
          <StatCard
            label="مخزون منخفض"
            value={o?.lowStockCount ?? 0}
            icon={PackageX}
            tone="danger"
            href="#low-stock"
            loading={overview.isPending}
          />
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-n-600">
          <Info className="size-3.5" aria-hidden />
          المبيعات تُحسب من الطلبات «تم التسليم» فقط، حسب تاريخ الطلب.
        </p>
        {o && (
          <div className="mt-3 flex flex-wrap gap-2">
            {ORDER_STATUSES.map((s) => (
              <Link key={s} href={`/dashboard/orders?status=${s}`} className="flex min-h-11 items-center gap-1.5 rounded-full border border-n-200 bg-n-0 ps-1.5 pe-3 text-sm hover:bg-n-100">
                <StatusBadge status={s} />
                <span className="font-bold">{o.byStatus[s]}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="incomplete-heading" className="mt-8">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h2 id="incomplete-heading" className="text-h3 font-bold">
              طلبات غير مكتملة
            </h2>
            <p className="text-xs text-n-600">زبائن عبّوا الطلب بس ما بعتوه على واتساب — تواصل معهم.</p>
          </div>
          <Link href="/dashboard/orders?incomplete=true" className={buttonVariants({ variant: 'link', size: 'sm' })}>
            عرض الكل
          </Link>
        </div>
        {incomplete.isPending ? (
          <OrderListSkeleton rows={2} />
        ) : incomplete.data?.items.length ? (
          <OrderList orders={incomplete.data.items} currency={currency} />
        ) : (
          <Card className="px-4 py-6 text-center text-sm text-n-600">لا توجد طلبات غير مكتملة 👌</Card>
        )}
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="top-heading">
          <h2 id="top-heading" className="mb-3 flex items-center gap-2 text-h3 font-bold">
            <Trophy className="size-5 text-accent-600" aria-hidden />
            الأكثر مبيعاً
          </h2>
          <Card className="divide-y divide-n-200">
            {top.isPending &&
              Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="flex items-center justify-between p-4">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-5 w-16" />
                </div>
              ))}
            {top.data?.length === 0 && <p className="p-6 text-center text-sm text-n-600">لا توجد مبيعات مُسلّمة بعد.</p>}
            {top.data?.map((p, i) => (
              <div key={`${p.productId}-${p.productName}`} className="flex items-center gap-3 p-4">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-n-100 text-sm font-bold text-n-700">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate font-semibold">{p.productName}</span>
                <span className="text-end">
                  <span className="block text-sm font-bold">{formatMoney(p.revenue, currency)}</span>
                  <span className="block text-xs text-n-600">{p.quantity} قطعة</span>
                </span>
              </div>
            ))}
          </Card>
        </section>

        <section aria-labelledby="low-heading" id="low-stock" className="scroll-mt-20">
          <h2 id="low-heading" className="mb-3 flex items-center gap-2 text-h3 font-bold">
            <AlertTriangle className="size-5 text-danger" aria-hidden />
            مخزون منخفض
          </h2>
          <Card className="divide-y divide-n-200">
            {low.isPending &&
              Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="flex items-center justify-between p-4">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-5 w-10" />
                </div>
              ))}
            {low.data?.length === 0 && <p className="p-6 text-center text-sm text-n-600">كل المنتجات متوفرة بكميات جيدة.</p>}
            {low.data?.map((p) => (
              <Link key={p.id} href={`/dashboard/products/${p.id}`} className="flex items-center gap-3 p-3 hover:bg-n-50">
                <span className="size-11 shrink-0 overflow-hidden rounded-md bg-n-100">
                  {p.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={assetUrl(p.image)!} alt="" className="size-full object-cover" />
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate font-semibold">{p.name}</span>
                <span
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-caption font-bold',
                    p.stock === 0 ? 'bg-status-cancelled-bg text-status-cancelled-fg' : 'bg-status-preparing-bg text-status-preparing-fg',
                  )}
                >
                  {p.stock === 0 ? 'نفد' : `${p.stock} متبقي`}
                </span>
              </Link>
            ))}
          </Card>
        </section>
      </div>
    </>
  );
}
