'use client';

import { formatMoney, ORDER_STATUS_LABELS, type OrderStatus } from '@matjari/shared';
import { ArrowRight, Check, MapPin, MessageCircle, PackageCheck, Phone, StickyNote } from 'lucide-react';
import Link from 'next/link';
import { use, useState } from 'react';
import { toast } from 'sonner';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/dialog';
import { Card, EmptyState, Skeleton } from '@/components/ui/misc';
import { apiError, getErrorMessage } from '@/lib/api';
import { useMe } from '@/lib/auth';
import { useOrder, useUpdateOrderStatus } from '@/lib/queries';
import { cn, formatDateTime, waLink } from '@/lib/utils';

const FLOW: OrderStatus[] = ['new', 'preparing', 'shipped', 'delivered'];
const ACTION_LABELS: Record<OrderStatus, string> = {
  new: 'جديد',
  preparing: 'بدء التجهيز',
  shipped: 'تم الشحن',
  delivered: 'تم التسليم',
  cancelled: 'إلغاء الطلب',
};

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const store = useMe().data?.store;
  const currency = store?.currency ?? 'SYP';
  const { data: order, isPending, error } = useOrder(id);
  const update = useUpdateOrderStatus();
  const [confirm, setConfirm] = useState<OrderStatus | null>(null);

  if (isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <EmptyState
        icon={<PackageCheck />}
        title={apiError(error)?.code === 'NOT_FOUND' ? 'الطلب غير موجود' : 'تعذر تحميل الطلب'}
        action={
          <Link href="/dashboard/orders" className={buttonVariants()}>
            العودة للطلبات
          </Link>
        }
      />
    );
  }

  async function changeStatus(status: OrderStatus) {
    try {
      await update.mutateAsync({ id, status });
      toast.success(`تم تحديث الحالة إلى «${ORDER_STATUS_LABELS[status]}»`);
      setConfirm(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
      setConfirm(null);
    }
  }

  const reached = order.status === 'cancelled' ? -1 : FLOW.indexOf(order.status);
  const forward = order.allowedTransitions.filter((s) => s !== 'cancelled');
  const canCancel = order.allowedTransitions.includes('cancelled');

  const customerMessage = `مرحباً ${order.customerName}، بخصوص طلبك رقم #${order.orderNumber} من ${store?.name ?? ''}:\n`;

  return (
    <>
      <Link href="/dashboard/orders" className="mb-3 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-n-600 hover:text-n-900">
        <ArrowRight className="size-4" aria-hidden />
        الطلبات
      </Link>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <h1 className="text-h2 font-bold">طلب #{order.orderNumber}</h1>
        <StatusBadge status={order.status} />
        {!order.whatsappOpened && <StatusBadge status="incomplete" />}
        <span className="w-full text-sm text-n-600">{formatDateTime(order.createdAt)}</span>
      </div>

      {!order.whatsappOpened && order.status !== 'cancelled' && (
        <div className="mb-4 rounded-md border border-accent-500/40 bg-accent-50 p-4 text-sm text-[#78350F]">
          <p className="font-bold">طلب غير مكتمل</p>
          <p className="mt-1">الزبون عبّأ الطلب لكن لم يفتح واتساب لإرساله. تواصل معه للتأكيد.</p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card className="p-4">
            <h2 className="mb-4 font-bold">حالة الطلب</h2>
            {order.status === 'cancelled' ? (
              <p className="rounded-md bg-status-cancelled-bg px-3 py-2 text-sm font-semibold text-status-cancelled-fg">تم إلغاء هذا الطلب.</p>
            ) : (
              <ol className="grid grid-cols-4 gap-1">
                {FLOW.map((s, i) => (
                  <li key={s} className="flex flex-col items-center gap-1.5 text-center">
                    <span
                      className={cn(
                        'flex size-8 items-center justify-center rounded-full text-sm font-bold',
                        i <= reached ? 'bg-brand-700 text-n-0' : 'bg-n-100 text-n-500',
                      )}
                    >
                      {i <= reached ? <Check className="size-4" aria-hidden /> : i + 1}
                    </span>
                    <span className={cn('text-caption', i === reached ? 'font-bold text-n-900' : 'text-n-600')}>{ORDER_STATUS_LABELS[s]}</span>
                  </li>
                ))}
              </ol>
            )}

            {(forward.length > 0 || canCancel) && (
              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                {forward.map((s) => (
                  <Button key={s} block className="sm:w-auto" loading={update.isPending && update.variables?.status === s} onClick={() => (s === 'delivered' ? setConfirm(s) : changeStatus(s))}>
                    {ACTION_LABELS[s]}
                  </Button>
                ))}
                {canCancel && (
                  <Button variant="danger-ghost" block className="sm:ms-auto sm:w-auto" onClick={() => setConfirm('cancelled')}>
                    {ACTION_LABELS.cancelled}
                  </Button>
                )}
              </div>
            )}
            {order.stockDeducted && <p className="mt-3 text-xs text-n-600">تم خصم الكميات من المخزون عند التسليم.</p>}
          </Card>

          <Card>
            <h2 className="border-b border-n-200 px-4 py-3 font-bold">المنتجات ({order.itemCount})</h2>
            <ul className="divide-y divide-n-200">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{item.productName}</p>
                    {Object.keys(item.selectedOptions).length > 0 && (
                      <p className="text-xs text-n-600">
                        {Object.entries(item.selectedOptions)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(' · ')}
                      </p>
                    )}
                    <p className="text-xs text-n-600">
                      {formatMoney(item.unitPrice, currency)} × {item.quantity}
                    </p>
                  </div>
                  <span className="font-bold whitespace-nowrap">{formatMoney(item.lineTotal, currency)}</span>
                </li>
              ))}
            </ul>
            <dl className="flex flex-col gap-1 border-t border-n-200 bg-n-50 px-4 py-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-n-600">المجموع</dt>
                <dd>{formatMoney(order.subtotal, currency)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-n-600">التوصيل ({order.zoneName})</dt>
                <dd>{formatMoney(order.deliveryFee, currency)}</dd>
              </div>
              <div className="flex justify-between text-body-lg font-bold">
                <dt>الإجمالي</dt>
                <dd>{formatMoney(order.total, currency)}</dd>
              </div>
            </dl>
          </Card>
        </div>

        <Card className="flex h-fit flex-col gap-4 p-4">
          <h2 className="font-bold">الزبون</h2>
          <p className="text-body-lg font-semibold">{order.customerName}</p>
          <div className="flex items-center gap-2 text-sm">
            <Phone className="size-4 text-n-500" aria-hidden />
            <a href={`tel:+${order.customerPhone}`} dir="ltr" className="font-semibold text-brand-700 hover:underline">
              +{order.customerPhone}
            </a>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="mt-1 size-4 shrink-0 text-n-500" aria-hidden />
            <span>
              <span className="font-semibold">{order.zoneName}</span>
              <br />
              {order.customerAddress}
            </span>
          </div>
          {order.notes && (
            <div className="flex items-start gap-2 rounded-md bg-accent-50 p-3 text-sm">
              <StickyNote className="mt-1 size-4 shrink-0 text-accent-600" aria-hidden />
              <span>{order.notes}</span>
            </div>
          )}
          <a href={waLink(order.customerPhone, customerMessage)} target="_blank" rel="noreferrer" className={buttonVariants({ variant: 'whatsapp', block: true })}>
            <MessageCircle aria-hidden />
            مراسلة على واتساب
          </a>
        </Card>
      </div>

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirm === 'cancelled' ? 'إلغاء الطلب؟' : 'تأكيد التسليم'}
        description={
          confirm === 'cancelled'
            ? 'لا يمكن التراجع عن الإلغاء.'
            : 'سيتم خصم كميات المنتجات من المخزون، ولا يمكن تغيير حالة الطلب بعد التسليم.'
        }
        confirmLabel={confirm ? ACTION_LABELS[confirm] : 'تأكيد'}
        destructive={confirm === 'cancelled'}
        loading={update.isPending}
        onConfirm={() => confirm && changeStatus(confirm)}
      />
    </>
  );
}
