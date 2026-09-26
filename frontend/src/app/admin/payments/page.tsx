'use client';

import { formatMoney, PAYMENT_METHOD_LABELS } from '@matjari/shared';
import { CreditCard } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { formatDate } from '@/components/access-badge';
import { Button } from '@/components/ui/button';
import { Card, EmptyState, PageHeader, Skeleton } from '@/components/ui/misc';
import { useAdminPayments } from '@/lib/admin-queries';

export default function AdminPaymentsPage() {
  const [page, setPage] = useState(1);
  const { data, isPending } = useAdminPayments(page);

  return (
    <>
      <PageHeader title="المدفوعات" description="كل عمليات تفعيل الاشتراكات المسجلة" />
      {isPending ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : !data?.items.length ? (
        <EmptyState icon={<CreditCard />} title="لا توجد مدفوعات بعد" description="عند تفعيل اشتراك متجر من صفحته، يظهر هنا." />
      ) : (
        <Card>
          <ul className="divide-y divide-n-200">
            {data.items.map((p) => (
              <li key={p.id} className="flex flex-wrap items-start justify-between gap-2 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <Link href={`/admin/stores/${p.storeId}`} className="font-semibold text-n-900 hover:underline">
                    {p.storeName ?? '—'}
                  </Link>
                  <p className="text-xs text-n-600">
                    {p.months} {p.months === 1 ? 'شهر' : 'أشهر'} · {p.method === 'other' ? 'أخرى' : PAYMENT_METHOD_LABELS[p.method]} · {formatDate(p.createdAt)}
                    {p.adminName ? ` · ${p.adminName}` : ''}
                  </p>
                  {p.note && <p className="text-xs text-n-700">{p.note}</p>}
                </div>
                <div className="text-end">
                  <p className="font-bold">{formatMoney(p.amount, p.currency)}</p>
                  <p className="text-xs text-n-600">حتى {formatDate(p.periodEnd)}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
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
