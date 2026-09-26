'use client';

import { ACCESS_STATE_LABELS, ACCESS_STATES, type AccessState } from '@matjari/shared';
import { Search, Store } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { AdminStoreList, AdminStoreListSkeleton } from '@/components/admin/store-list';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState, PageHeader } from '@/components/ui/misc';
import { useDebouncedValue } from '@/hooks/use-debounce';
import { useAdminStores } from '@/lib/admin-queries';
import { cn } from '@/lib/utils';

function StoresContent() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const stateParam = params.get('state');
  const state = (ACCESS_STATES as readonly string[]).includes(stateParam ?? '') ? (stateParam as AccessState) : undefined;
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debounced = useDebouncedValue(search.trim(), 400);
  const { data, isPending, isFetching } = useAdminStores({ state, search: debounced || undefined, page, limit: 20 });

  function setState(s?: AccessState) {
    setPage(1);
    router.replace(s ? `${pathname}?state=${s}` : pathname, { scroll: false });
  }

  return (
    <>
      <PageHeader title="المتاجر" description={data ? `${data.total} متجر` : undefined} />

      <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none md:mx-0 md:flex-wrap md:px-0" role="group" aria-label="تصفية حسب الحالة">
        {[undefined, ...ACCESS_STATES].map((s) => (
          <button
            key={s ?? 'all'}
            type="button"
            aria-pressed={state === s}
            onClick={() => setState(s)}
            className={cn(
              'min-h-11 shrink-0 cursor-pointer rounded-full border px-4 text-sm font-semibold whitespace-nowrap',
              state === s ? 'border-n-900 bg-n-900 text-n-0' : 'border-n-200 bg-n-0 text-n-700 hover:bg-n-100',
            )}
          >
            {s ? ACCESS_STATE_LABELS[s] : 'الكل'}
          </button>
        ))}
      </div>

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-5 -translate-y-1/2 text-n-500" aria-hidden />
        <Input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="ابحث باسم المتجر أو الرابط أو إيميل التاجر أو الرقم"
          aria-label="بحث في المتاجر"
          className="ps-10"
        />
      </div>

      <div className={cn(isFetching && !isPending && 'opacity-60')}>
        {isPending ? (
          <AdminStoreListSkeleton />
        ) : data?.items.length ? (
          <AdminStoreList stores={data.items} />
        ) : (
          <EmptyState icon={<Store />} title="لا توجد متاجر مطابقة" />
        )}
      </div>

      {data && data.pages > 1 && (
        <nav className="mt-4 flex items-center justify-between" aria-label="الصفحات">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            السابق
          </Button>
          <span className="text-sm text-n-600">
            صفحة {page} من {data.pages}
          </span>
          <Button variant="secondary" size="sm" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>
            التالي
          </Button>
        </nav>
      )}
    </>
  );
}

export default function AdminStoresPage() {
  return (
    <Suspense fallback={<AdminStoreListSkeleton />}>
      <StoresContent />
    </Suspense>
  );
}
