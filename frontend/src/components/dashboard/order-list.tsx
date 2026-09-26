'use client';

import { formatMoney, type OrderSummaryDto } from '@matjari/shared';
import { ChevronLeft, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/misc';
import { cn, relativeTime, waLink } from '@/lib/utils';
import { StatusBadge } from './status-badge';

function WhatsappButton({ phone, name }: { phone: string; name: string }) {
  return (
    <a
      href={waLink(phone)}
      target="_blank"
      rel="noreferrer"
      aria-label={`مراسلة ${name} على واتساب`}
      onClick={(e) => e.stopPropagation()}
      className="flex size-11 shrink-0 items-center justify-center rounded-full bg-whatsapp/15 text-whatsapp-strong hover:bg-whatsapp/25"
    >
      <MessageCircle className="size-5" aria-hidden />
    </a>
  );
}

/** Table on desktop, cards on mobile. Unsent (incomplete) orders are highlighted in amber. */
export function OrderList({ orders, currency }: { orders: OrderSummaryDto[]; currency: string }) {
  return (
    <>
      <ul className="flex flex-col gap-2 md:hidden">
        {orders.map((o) => (
          <li
            key={o.id}
            className={cn(
              'flex items-center gap-3 rounded-lg border p-3',
              o.whatsappOpened ? 'border-n-200 bg-n-0' : 'border-accent-500/40 bg-accent-50',
            )}
          >
            <Link href={`/dashboard/orders/${o.id}`} className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-n-900">#{o.orderNumber}</span>
                <StatusBadge status={o.status} />
                {!o.whatsappOpened && <StatusBadge status="incomplete" />}
              </div>
              <span className="truncate text-sm text-n-700">{o.customerName}</span>
              <span className="flex items-center gap-2 text-xs text-n-600">
                <span className="font-semibold text-n-900">{formatMoney(o.total, currency)}</span>·<span>{relativeTime(o.createdAt)}</span>
              </span>
            </Link>
            <WhatsappButton phone={o.customerPhone} name={o.customerName} />
          </li>
        ))}
      </ul>

      <div className="hidden overflow-hidden rounded-lg border border-n-200 bg-n-0 md:block">
        <table className="w-full text-start text-sm">
          <thead className="bg-n-50 text-xs text-n-600">
            <tr>
              <th scope="col" className="px-4 py-3 text-start font-semibold">رقم الطلب</th>
              <th scope="col" className="px-4 py-3 text-start font-semibold">الزبون</th>
              <th scope="col" className="px-4 py-3 text-start font-semibold">الإجمالي</th>
              <th scope="col" className="px-4 py-3 text-start font-semibold">الحالة</th>
              <th scope="col" className="px-4 py-3 text-start font-semibold">التاريخ</th>
              <th scope="col" className="px-4 py-3 text-start font-semibold">
                <span className="sr-only">إجراءات</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-n-200">
            {orders.map((o) => (
              <tr key={o.id} className={cn('hover:bg-n-50', !o.whatsappOpened && 'bg-accent-50 hover:bg-accent-100')}>
                <td className="px-4 py-3 font-bold">
                  <Link href={`/dashboard/orders/${o.id}`} className="hover:underline">
                    #{o.orderNumber}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <div className="font-semibold text-n-900">{o.customerName}</div>
                  <div className="text-xs text-n-600" dir="ltr">
                    +{o.customerPhone}
                  </div>
                </td>
                <td className="px-4 py-3 font-semibold whitespace-nowrap">{formatMoney(o.total, currency)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    <StatusBadge status={o.status} />
                    {!o.whatsappOpened && <StatusBadge status="incomplete" />}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs whitespace-nowrap text-n-600">{relativeTime(o.createdAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <WhatsappButton phone={o.customerPhone} name={o.customerName} />
                    <Link
                      href={`/dashboard/orders/${o.id}`}
                      aria-label={`تفاصيل الطلب ${o.orderNumber}`}
                      className="flex size-11 items-center justify-center rounded-full text-n-600 hover:bg-n-100"
                    >
                      <ChevronLeft className="size-5" aria-hidden />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function OrderListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <ul className="flex flex-col gap-2" aria-label="جاري التحميل">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="flex items-center gap-3 rounded-lg border border-n-200 bg-n-0 p-3">
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-44" />
          </div>
          <Skeleton className="size-11 rounded-full" />
        </li>
      ))}
    </ul>
  );
}
