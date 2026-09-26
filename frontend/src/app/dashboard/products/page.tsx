'use client';

import { formatMoney, type ProductDto } from '@matjari/shared';
import { ArrowDown, ArrowUp, ImageOff, Package, Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input, NativeSelect } from '@/components/ui/input';
import { Badge, EmptyState, PageHeader, Skeleton } from '@/components/ui/misc';
import { Switch } from '@/components/ui/switch';
import { useDebouncedValue } from '@/hooks/use-debounce';
import { getErrorMessage } from '@/lib/api';
import { useMe } from '@/lib/auth';
import { useCategories, useProductMutations, useProducts } from '@/lib/queries';
import { assetUrl, cn } from '@/lib/utils';

function StockBadge({ p }: { p: ProductDto }) {
  if (!p.trackStock) return <Badge>بدون تتبع</Badge>;
  if (p.stock === 0) return <Badge tone="danger">نفد المخزون</Badge>;
  if (p.stock <= 5) return <Badge tone="accent">{p.stock} متبقي</Badge>;
  return <Badge tone="brand">{p.stock} متوفر</Badge>;
}

export default function ProductsPage() {
  const currency = useMe().data?.store?.currency ?? 'SYP';
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [page, setPage] = useState(1);
  const debounced = useDebouncedValue(search.trim(), 400);
  const filtered = Boolean(debounced || categoryId);

  const query = { search: debounced || undefined, categoryId: categoryId || undefined, page, limit: filtered ? 20 : 100 };
  const { data, isPending, isFetching } = useProducts(query);
  const categories = useCategories();
  const { toggle, reorder } = useProductMutations();
  const canReorder = !filtered && page === 1 && (data?.total ?? 0) <= 100;
  const categoryName = new Map(categories.data?.map((c) => [c.id, c.name]));

  function move(index: number, dir: -1 | 1) {
    if (!data) return;
    const ids = data.items.map((p) => p.id);
    const [id] = ids.splice(index, 1);
    ids.splice(index + dir, 0, id!);
    reorder.mutate(ids, { onError: (err) => toast.error(getErrorMessage(err)) });
  }

  return (
    <>
      <PageHeader
        title="المنتجات"
        description={data ? `${data.total} منتج` : undefined}
        actions={
          <Link href="/dashboard/products/new" className={buttonVariants()}>
            <Plus aria-hidden />
            منتج جديد
          </Link>
        }
      />

      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_220px]">
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-5 -translate-y-1/2 text-n-500" aria-hidden />
          <Input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="ابحث عن منتج"
            aria-label="بحث في المنتجات"
            className="ps-10"
          />
        </div>
        <div className="relative">
          <NativeSelect
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setPage(1);
            }}
            aria-label="تصفية حسب التصنيف"
          >
            <option value="">كل التصنيفات</option>
            {categories.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      {isPending ? (
        <ul className="flex flex-col gap-2">
          {Array.from({ length: 5 }, (_, i) => (
            <li key={i} className="flex items-center gap-3 rounded-lg border border-n-200 bg-n-0 p-3">
              <Skeleton className="size-16" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-24" />
              </div>
            </li>
          ))}
        </ul>
      ) : !data?.items.length ? (
        filtered ? (
          <EmptyState icon={<Search />} title="لا توجد منتجات مطابقة" description="جرّب كلمة بحث أخرى أو تصنيفاً مختلفاً." />
        ) : (
          <EmptyState
            icon={<Package />}
            title="أضف أول منتج"
            description="المنتجات اللي بتضيفها بتظهر فوراً بمتجرك."
            action={
              <Link href="/dashboard/products/new" className={buttonVariants()}>
                <Plus aria-hidden />
                أضف أول منتج
              </Link>
            }
          />
        )
      ) : (
        <ul className={cn('flex flex-col gap-2 transition-opacity', isFetching && 'opacity-70')}>
          {data.items.map((p, i) => (
            <li key={p.id} className={cn('flex items-center gap-3 rounded-lg border border-n-200 bg-n-0 p-3', !p.isActive && 'bg-n-50')}>
              {canReorder && (
                <div className="flex flex-col">
                  <Button variant="ghost" size="icon" className="size-9 min-h-9" aria-label={`نقل ${p.name} للأعلى`} disabled={i === 0 || reorder.isPending} onClick={() => move(i, -1)}>
                    <ArrowUp className="!size-4" aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-9 min-h-9"
                    aria-label={`نقل ${p.name} للأسفل`}
                    disabled={i === data.items.length - 1 || reorder.isPending}
                    onClick={() => move(i, 1)}
                  >
                    <ArrowDown className="!size-4" aria-hidden />
                  </Button>
                </div>
              )}
              <Link href={`/dashboard/products/${p.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <span className={cn('flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-n-100', !p.isActive && 'opacity-50')}>
                  {p.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={assetUrl(p.images[0])!} alt="" className="size-full object-cover" loading="lazy" />
                  ) : (
                    <ImageOff className="size-6 text-n-400" aria-hidden />
                  )}
                </span>
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="truncate font-semibold text-n-900">{p.name}</span>
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                    <span className="font-bold">{formatMoney(p.price, currency)}</span>
                    {p.comparePrice && <span className="text-xs text-n-500 line-through">{formatMoney(p.comparePrice, currency)}</span>}
                    <StockBadge p={p} />
                    {p.categoryId && <span className="text-xs text-n-600">{categoryName.get(p.categoryId)}</span>}
                  </span>
                </span>
              </Link>
              <Switch
                hideLabel
                label={p.isActive ? `إخفاء ${p.name}` : `إظهار ${p.name}`}
                checked={p.isActive}
                disabled={toggle.isPending && toggle.variables === p.id}
                onCheckedChange={() =>
                  toggle.mutate(p.id, {
                    onSuccess: (updated) => toast.success(updated.isActive ? 'المنتج ظاهر الآن' : 'تم إخفاء المنتج'),
                    onError: (err) => toast.error(getErrorMessage(err)),
                  })
                }
              />
            </li>
          ))}
        </ul>
      )}

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
