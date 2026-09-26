'use client';

import { ORDER_STATUS_LABELS, ORDER_STATUSES, type OrderListQuery, type OrderStatus } from '@matjari/shared';
import { Download, Search, ShoppingCart, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { OrderList, OrderListSkeleton } from '@/components/dashboard/order-list';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState, PageHeader } from '@/components/ui/misc';
import { useDebouncedValue } from '@/hooks/use-debounce';
import { getErrorMessage } from '@/lib/api';
import { useMe } from '@/lib/auth';
import { downloadOrdersCsv, useOrders } from '@/lib/queries';
import { cn } from '@/lib/utils';

type Chip = { key: string; label: string; status?: OrderStatus; incomplete?: boolean };
const CHIPS: Chip[] = [
  { key: 'all', label: 'الكل' },
  { key: 'incomplete', label: 'غير مكتملة', incomplete: true },
  ...ORDER_STATUSES.map((s) => ({ key: s, label: ORDER_STATUS_LABELS[s], status: s })),
];

function OrdersContent() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const currency = useMe().data?.store?.currency ?? 'SYP';

  const status = (ORDER_STATUSES as readonly string[]).includes(params.get('status') ?? '')
    ? (params.get('status') as OrderStatus)
    : undefined;
  const incomplete = params.get('incomplete') === 'true' ? true : undefined;
  const page = Math.max(1, Number(params.get('page')) || 1);
  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';
  const activeChip = incomplete ? 'incomplete' : (status ?? 'all');

  const [search, setSearch] = useState(params.get('search') ?? '');
  const debouncedSearch = useDebouncedValue(search.trim(), 400);
  const [exporting, setExporting] = useState(false);

  function setParams(next: Record<string, string | undefined>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    if (!('page' in next)) sp.delete('page');
    router.replace(`${pathname}${sp.size ? `?${sp}` : ''}`, { scroll: false });
  }

  useEffect(() => {
    if ((params.get('search') ?? '') !== debouncedSearch) setParams({ search: debouncedSearch || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const filters = {
    status,
    incomplete,
    search: params.get('search') || undefined,
    from: from || undefined,
    to: to || undefined,
  } satisfies Omit<OrderListQuery, 'page' | 'limit'>;
  const { data, isPending, isFetching } = useOrders({ ...filters, page, limit: 20 });
  const hasFilters = Boolean(status || incomplete || filters.search || from || to);

  async function exportCsv() {
    setExporting(true);
    try {
      await downloadOrdersCsv(filters);
    } catch (err) {
      toast.error(getErrorMessage(err, 'تعذر تصدير الطلبات'));
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="الطلبات"
        description={data ? `${data.total} طلب` : undefined}
        actions={
          <Button variant="secondary" size="sm" onClick={exportCsv} loading={exporting} disabled={!data?.total}>
            <Download aria-hidden />
            تصدير CSV
          </Button>
        }
      />

      <div className="flex flex-col gap-3">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none md:mx-0 md:flex-wrap md:px-0" role="group" aria-label="تصفية حسب الحالة">
          {CHIPS.map((chip) => (
            <button
              key={chip.key}
              type="button"
              aria-pressed={activeChip === chip.key}
              onClick={() => setParams({ status: chip.status, incomplete: chip.incomplete ? 'true' : undefined })}
              className={cn(
                'min-h-11 shrink-0 cursor-pointer rounded-full border px-4 text-sm font-semibold whitespace-nowrap transition-colors',
                activeChip === chip.key
                  ? 'border-n-900 bg-n-900 text-n-0'
                  : chip.incomplete
                    ? 'border-accent-500/50 bg-accent-50 text-[#92400E] hover:bg-accent-100'
                    : 'border-n-200 bg-n-0 text-n-700 hover:bg-n-100',
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>

        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-5 -translate-y-1/2 text-n-500" aria-hidden />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث برقم الطلب أو الاسم أو الهاتف"
              aria-label="بحث في الطلبات"
              className="ps-10"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-n-700">
            <span className="shrink-0">من</span>
            <Input type="date" value={from} max={to || undefined} onChange={(e) => setParams({ from: e.target.value || undefined })} className="min-w-0" />
          </label>
          <label className="flex items-center gap-2 text-sm text-n-700">
            <span className="shrink-0">إلى</span>
            <Input type="date" value={to} min={from || undefined} onChange={(e) => setParams({ to: e.target.value || undefined })} className="min-w-0" />
          </label>
        </div>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="w-fit"
            onClick={() => {
              setSearch('');
              router.replace(pathname, { scroll: false });
            }}
          >
            <X aria-hidden />
            مسح الفلاتر
          </Button>
        )}
      </div>

      <div className={cn('mt-4 transition-opacity', isFetching && !isPending && 'opacity-60')}>
        {isPending ? (
          <OrderListSkeleton />
        ) : !data?.items.length ? (
          <EmptyState
            icon={<ShoppingCart />}
            title={hasFilters ? 'لا توجد طلبات مطابقة' : 'لا توجد طلبات بعد'}
            description={hasFilters ? 'جرّب تغيير الفلاتر أو البحث.' : 'شارك رابط متجرك على إنستغرام وواتساب لتصلك أول الطلبات.'}
          />
        ) : (
          <OrderList orders={data.items} currency={currency} />
        )}
      </div>

      {data && data.pages > 1 && (
        <nav className="mt-4 flex items-center justify-between gap-2" aria-label="الصفحات">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setParams({ page: String(page - 1) })}>
            السابق
          </Button>
          <span className="text-sm text-n-600">
            صفحة {page} من {data.pages}
          </span>
          <Button variant="secondary" size="sm" disabled={page >= data.pages} onClick={() => setParams({ page: String(page + 1) })}>
            التالي
          </Button>
        </nav>
      )}
    </>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<OrderListSkeleton />}>
      <OrdersContent />
    </Suspense>
  );
}
