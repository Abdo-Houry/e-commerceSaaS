'use client';

import type { AdminStoreSummaryDto } from '@matjari/shared';
import { ChevronLeft, Store } from 'lucide-react';
import Link from 'next/link';
import { AccessBadge, formatDate } from '@/components/access-badge';
import { Skeleton } from '@/components/ui/misc';
import { assetUrl } from '@/lib/utils';

function endsLabel(s: AdminStoreSummaryDto) {
  const a = s.access;
  if (a.state === 'suspended') return 'موقوف من الإدارة';
  if (a.state === 'expired') return `انتهى ${formatDate(a.endsAt)}`;
  if (a.state === 'grace') return `يتوقف خلال ${a.daysLeft} ${a.daysLeft === 1 ? 'يوم' : 'أيام'}`;
  return `حتى ${formatDate(a.endsAt)}`;
}

export function AdminStoreList({ stores }: { stores: AdminStoreSummaryDto[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {stores.map((s) => {
        const logo = assetUrl(s.logoUrl);
        return (
          <li key={s.id}>
            <Link href={`/admin/stores/${s.id}`} className="flex items-center gap-3 rounded-lg border border-n-200 bg-n-0 p-3 hover:border-n-300">
              <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-md bg-n-100 text-n-500">
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logo} alt="" className="size-full object-cover" />
                ) : (
                  <Store className="size-5" aria-hidden />
                )}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-semibold text-n-900">{s.name}</span>
                  <AccessBadge state={s.access.state} />
                </span>
                <span className="truncate text-xs text-n-600">
                  {s.owner.name} · <span dir="ltr">{s.owner.email}</span>
                </span>
                <span className="text-xs text-n-600">
                  {endsLabel(s)} · {s.productCount} منتج · {s.orderCount} طلب
                </span>
              </span>
              <ChevronLeft className="size-5 shrink-0 text-n-400" aria-hidden />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function AdminStoreListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <ul className="flex flex-col gap-2">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="flex items-center gap-3 rounded-lg border border-n-200 bg-n-0 p-3">
          <Skeleton className="size-11" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
        </li>
      ))}
    </ul>
  );
}
