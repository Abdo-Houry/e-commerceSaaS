'use client';

import { formatMoney } from '@matjari/shared';
import { CheckCircle2, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useCart } from '@/components/storefront/storefront-context';
import { API_URL } from '@/lib/env';
import { readPlacedOrder, type PlacedOrder } from '@/lib/order-session';

export function ThankYouView({ orderNumber }: { orderNumber: string }) {
  const { store } = useCart();
  const [order, setOrder] = useState<PlacedOrder | null>(null);

  useEffect(() => setOrder(readPlacedOrder(store.slug, orderNumber)), [store.slug, orderNumber]);

  const safeNumber = /^\d{1,9}$/.test(orderNumber) ? orderNumber : '';

  return (
    <main className="mx-auto flex max-w-lg flex-col items-center px-4 pt-10 text-center">
      <span className="flex size-20 items-center justify-center rounded-full bg-status-delivered-bg">
        <CheckCircle2 className="size-11 text-status-delivered-fg" aria-hidden />
      </span>
      <h1 className="mt-4 text-h2 font-bold text-n-900">تم تسجيل طلبك</h1>
      {safeNumber && (
        <p className="mt-2 text-n-700">
          رقم الطلب <span className="block text-h1 font-bold text-n-900" dir="ltr">#{safeNumber}</span>
        </p>
      )}
      {order && <p className="mt-1 text-sm text-n-600">الإجمالي {formatMoney(order.total, order.currency)} — الدفع عند الاستلام</p>}

      <div className="mt-6 w-full rounded-lg border border-n-200 bg-n-0 p-4 text-start text-sm text-n-700">
        <p className="font-bold text-n-900">الخطوة الأخيرة</p>
        <p className="mt-1">
          أرسل الرسالة الجاهزة في واتساب ليصل طلبك إلى {store.name}. إذا لم يُفتح واتساب تلقائياً، اضغط الزر أدناه.
        </p>
      </div>

      {order ? (
        <a
          href={order.whatsappUrl}
          onClick={() => {
            void fetch(`${API_URL}/public/orders/${order.id}/whatsapp-opened`, { method: 'PATCH', keepalive: true }).catch(() => {});
          }}
          className="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-md bg-whatsapp-strong text-body-lg font-bold text-n-0 hover:bg-[#0B6535]"
        >
          <MessageCircle className="size-5" aria-hidden />
          فتح واتساب وإرسال الطلب
        </a>
      ) : (
        <a
          href={`https://wa.me/${store.whatsappNumber}?text=${encodeURIComponent(`مرحباً، بخصوص طلبي رقم #${safeNumber}`)}`}
          className="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-md bg-whatsapp-strong text-body-lg font-bold text-n-0 hover:bg-[#0B6535]"
        >
          <MessageCircle className="size-5" aria-hidden />
          تواصل مع المتجر على واتساب
        </a>
      )}

      <Link href={`/s/${store.slug}`} className="mt-3 flex min-h-11 items-center font-semibold text-n-700 hover:text-n-900 hover:underline">
        متابعة التسوق
      </Link>
    </main>
  );
}
