'use client';

import { formatMoney, type AccessState } from '@matjari/shared';
import { AlarmClock, Ban, Clock, CreditCard, Inbox, ShoppingCart, Sparkles, Store, Users } from 'lucide-react';
import Link from 'next/link';
import { AdminStoreList, AdminStoreListSkeleton } from '@/components/admin/store-list';
import { Card, PageHeader, Skeleton } from '@/components/ui/misc';
import { useAdminOverview } from '@/lib/admin-queries';
import { cn } from '@/lib/utils';

function Stat({
  label,
  value,
  icon: Icon,
  href,
  tone = 'n',
  loading,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  tone?: 'n' | 'brand' | 'info' | 'accent' | 'danger';
  loading: boolean;
}) {
  const tones = {
    n: 'bg-n-100 text-n-700',
    brand: 'bg-brand-50 text-brand-700',
    info: 'bg-status-new-bg text-status-new-fg',
    accent: 'bg-accent-100 text-[#B45309]',
    danger: 'bg-status-cancelled-bg text-status-cancelled-fg',
  };
  const body = (
    <Card className={cn('flex h-full items-center gap-3 p-4', href && 'hover:border-n-300')}>
      <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-md', tones[tone])}>
        <Icon className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-xs text-n-600">{label}</span>
        {loading ? <Skeleton className="mt-1 h-6 w-16" /> : <span className="block text-h3 font-bold text-n-900">{value}</span>}
      </span>
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

const stateLink = (s: AccessState) => `/admin/stores?state=${s}`;

export default function AdminOverviewPage() {
  const { data, isPending } = useAdminOverview();
  const d = data;

  return (
    <>
      <PageHeader title="نظرة عامة على المنصة" />

      {(d?.pendingRequests ?? 0) > 0 && (
        <Link
          href="/admin/requests"
          className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-accent-500/50 bg-accent-50 p-4 hover:bg-accent-100"
        >
          <span className="flex items-center gap-2 font-bold text-[#78350F]">
            <Inbox className="size-5" aria-hidden />
            {d!.pendingRequests} {d!.pendingRequests === 1 ? 'طلب اشتراك' : 'طلبات اشتراك'} بانتظار مراجعتك
          </span>
          <span className="text-sm font-semibold text-[#78350F]">مراجعة ←</span>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="كل المتاجر" value={d?.stores.total ?? 0} icon={Store} href="/admin/stores" loading={isPending} />
        <Stat label="مشتركون" value={d?.stores.active ?? 0} icon={CreditCard} tone="brand" href={stateLink('active')} loading={isPending} />
        <Stat label="تجربة مجانية" value={d?.stores.trial ?? 0} icon={Sparkles} tone="info" href={stateLink('trial')} loading={isPending} />
        <Stat label="فترة سماح" value={d?.stores.grace ?? 0} icon={Clock} tone="accent" href={stateLink('grace')} loading={isPending} />
        <Stat label="منتهية" value={d?.stores.expired ?? 0} icon={AlarmClock} href={stateLink('expired')} loading={isPending} />
        <Stat label="موقوفة" value={d?.stores.suspended ?? 0} icon={Ban} tone="danger" href={stateLink('suspended')} loading={isPending} />
        <Stat label="التجار" value={d?.merchants ?? 0} icon={Users} loading={isPending} />
        <Stat label="متاجر جديدة (30 يوم)" value={d?.stores.newLast30Days ?? 0} icon={Store} loading={isPending} />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Card className="p-4">
          <p className="text-xs text-n-600">إيرادات الاشتراكات هذا الشهر</p>
          {isPending ? (
            <Skeleton className="mt-1 h-8 w-32" />
          ) : (
            <p className="text-h2 font-bold text-brand-700">{formatMoney(d?.subscriptionRevenue.thisMonth ?? 0, d?.subscriptionRevenue.currency ?? 'SYP')}</p>
          )}
          <p className="text-xs text-n-600">آخر 30 يوماً: {formatMoney(d?.subscriptionRevenue.last30Days ?? 0, d?.subscriptionRevenue.currency ?? 'SYP')}</p>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <span className="flex size-11 items-center justify-center rounded-md bg-n-100 text-n-700">
            <ShoppingCart className="size-5" aria-hidden />
          </span>
          <span>
            <span className="block text-xs text-n-600">طلبات الزبائن على كل المتاجر</span>
            <span className="block text-h3 font-bold">{isPending ? '…' : (d?.orders.total ?? 0)}</span>
            <span className="block text-xs text-n-600">آخر 30 يوماً: {d?.orders.last30Days ?? 0}</span>
          </span>
        </Card>
      </div>

      <section className="mt-8" aria-labelledby="ending-h">
        <h2 id="ending-h" className="text-h3 font-bold">
          متاجر ستتوقف خلال 3 أيام
        </h2>
        <p className="mb-3 text-xs text-n-600">تواصل معهم لتذكيرهم بالتجديد.</p>
        {isPending ? (
          <AdminStoreListSkeleton rows={2} />
        ) : d?.endingSoon.length ? (
          <AdminStoreList stores={d.endingSoon} />
        ) : (
          <Card className="px-4 py-6 text-center text-sm text-n-600">لا توجد متاجر قريبة من التوقف 👌</Card>
        )}
      </section>
    </>
  );
}
