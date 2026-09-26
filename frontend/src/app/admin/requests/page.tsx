'use client';

import { formatMoney, PAYMENT_METHOD_LABELS, REQUEST_STATUS_LABELS, REQUEST_STATUSES, type RequestStatus, type SubscriptionRequestDto } from '@matjari/shared';
import { Check, ExternalLink, Inbox, MessageCircle, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { toast } from 'sonner';
import { formatDate } from '@/components/access-badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog, Dialog, DialogContent } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Textarea } from '@/components/ui/input';
import { Card, EmptyState, PageHeader, Skeleton } from '@/components/ui/misc';
import { useAdminRequestActions, useAdminRequests } from '@/lib/admin-queries';
import { getErrorMessage } from '@/lib/api';
import { assetUrl, cn, waLink } from '@/lib/utils';

const statusStyle: Record<RequestStatus, string> = {
  pending: 'bg-status-new-bg text-status-new-fg',
  approved: 'bg-status-delivered-bg text-status-delivered-fg',
  rejected: 'bg-status-cancelled-bg text-status-cancelled-fg',
};

function RequestCard({ r }: { r: SubscriptionRequestDto }) {
  const { approve, reject } = useAdminRequestActions();
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [receiptOpen, setReceiptOpen] = useState(false);
  const receipt = assetUrl(r.receiptUrl);

  return (
    <li>
      <Card className={cn('flex flex-col gap-3 p-4', r.status === 'pending' && 'border-status-new-fg/40')}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <Link href={`/admin/stores/${r.store?.id}`} className="font-bold text-n-900 hover:underline">
              {r.store?.name}
            </Link>
            <p className="text-xs text-n-600">
              <span dir="ltr">/s/{r.store?.slug}</span> · <span dir="ltr">{r.store?.ownerEmail}</span>
            </p>
          </div>
          <span className={cn('rounded-full px-2.5 py-0.5 text-caption font-semibold', statusStyle[r.status])}>{REQUEST_STATUS_LABELS[r.status]}</span>
        </div>

        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-n-600">الباقة</dt>
            <dd className="font-semibold">{r.planName}</dd>
          </div>
          <div>
            <dt className="text-n-600">المبلغ</dt>
            <dd className="font-bold text-brand-700">{formatMoney(r.amount, r.currency)}</dd>
          </div>
          <div>
            <dt className="text-n-600">طريقة الدفع</dt>
            <dd className="font-semibold">{PAYMENT_METHOD_LABELS[r.method]}</dd>
          </div>
          <div>
            <dt className="text-n-600">التاريخ</dt>
            <dd className="font-semibold">{formatDate(r.createdAt)}</dd>
          </div>
          {r.reference && (
            <div className="col-span-2 sm:col-span-4">
              <dt className="text-n-600">المرجع</dt>
              <dd className="font-semibold break-all" dir="auto">
                {r.reference}
              </dd>
            </div>
          )}
          {r.note && (
            <div className="col-span-2 sm:col-span-4">
              <dt className="text-n-600">ملاحظة</dt>
              <dd>{r.note}</dd>
            </div>
          )}
          {r.rejectionReason && (
            <div className="col-span-2 sm:col-span-4">
              <dt className="text-n-600">سبب الرفض</dt>
              <dd className="text-status-cancelled-fg">{r.rejectionReason}</dd>
            </div>
          )}
        </dl>

        {receipt && (
          <button type="button" onClick={() => setReceiptOpen(true)} className="w-fit cursor-pointer overflow-hidden rounded-md border border-n-200" aria-label="عرض صورة الإشعار">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={receipt} alt="" className="h-28 w-auto object-cover" />
          </button>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {r.status === 'pending' && (
            <>
              <Button onClick={() => setApproveOpen(true)}>
                <Check aria-hidden />
                موافقة وتفعيل
              </Button>
              <Button variant="danger-ghost" onClick={() => setRejectOpen(true)}>
                <X aria-hidden />
                رفض
              </Button>
            </>
          )}
          {r.store?.whatsappNumber && (
            <a
              href={waLink(r.store.whatsappNumber, `مرحباً، بخصوص طلب اشتراك متجرك «${r.store.name}» (${r.planName})`)}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-11 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold text-whatsapp-strong hover:bg-n-100 sm:ms-auto"
            >
              <MessageCircle className="size-4" aria-hidden />
              مراسلة التاجر
            </a>
          )}
        </div>
      </Card>

      <ConfirmDialog
        open={approveOpen}
        onOpenChange={setApproveOpen}
        title="تأكيد استلام الدفعة؟"
        description={`سيتم تفعيل ${r.planName} لمتجر «${r.store?.name}» بمبلغ ${formatMoney(r.amount, r.currency)}.`}
        confirmLabel="موافقة وتفعيل"
        loading={approve.isPending}
        onConfirm={async () => {
          try {
            await approve.mutateAsync(r.id);
            toast.success('تم تفعيل الاشتراك');
            setApproveOpen(false);
          } catch (err) {
            toast.error(getErrorMessage(err));
          }
        }}
      />

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent title="رفض الطلب" description="يظهر السبب للتاجر ويمكنه إرسال طلب جديد.">
          <div className="flex flex-col gap-4">
            <Field label="السبب">
              <Textarea rows={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="مثال: لم يصل المبلغ، يرجى التأكد من رقم العملية" />
            </Field>
            <Button
              variant="danger"
              block
              disabled={!reason.trim()}
              loading={reject.isPending}
              onClick={async () => {
                try {
                  await reject.mutateAsync({ id: r.id, reason: reason.trim() });
                  toast.success('تم رفض الطلب');
                  setRejectOpen(false);
                } catch (err) {
                  toast.error(getErrorMessage(err));
                }
              }}
            >
              رفض الطلب
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {receipt && (
        <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
          <DialogContent title="صورة الإشعار" className="sm:max-w-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={receipt} alt="إشعار الدفع" className="w-full rounded-md" />
            <a href={receipt} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand-700">
              <ExternalLink className="size-4" aria-hidden />
              فتح بالحجم الكامل
            </a>
          </DialogContent>
        </Dialog>
      )}
    </li>
  );
}

function RequestsContent() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const raw = params.get('status');
  const status: RequestStatus | undefined = raw === 'all' ? undefined : ((REQUEST_STATUSES as readonly string[]).includes(raw ?? '') ? (raw as RequestStatus) : 'pending');
  const [page, setPage] = useState(1);
  const { data, isPending } = useAdminRequests(status, page);

  return (
    <>
      <PageHeader title="طلبات الاشتراك" description="راجع الدفعات وفعّل اشتراكات التجار" />
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="تصفية">
        {([...REQUEST_STATUSES, 'all'] as const).map((s) => {
          const active = (s === 'all' ? undefined : s) === status;
          return (
            <button
              key={s}
              type="button"
              aria-pressed={active}
              onClick={() => {
                setPage(1);
                router.replace(`${pathname}?status=${s}`, { scroll: false });
              }}
              className={cn(
                'min-h-11 cursor-pointer rounded-full border px-4 text-sm font-semibold',
                active ? 'border-n-900 bg-n-900 text-n-0' : 'border-n-200 bg-n-0 text-n-700 hover:bg-n-100',
              )}
            >
              {s === 'all' ? 'الكل' : REQUEST_STATUS_LABELS[s]}
            </button>
          );
        })}
      </div>

      {isPending ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : !data?.items.length ? (
        <EmptyState icon={<Inbox />} title={status === 'pending' ? 'لا توجد طلبات بانتظار المراجعة' : 'لا توجد طلبات'} />
      ) : (
        <ul className="flex flex-col gap-3">
          {data.items.map((r) => (
            <RequestCard key={r.id} r={r} />
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

export default function AdminRequestsPage() {
  return (
    <Suspense>
      <RequestsContent />
    </Suspense>
  );
}
