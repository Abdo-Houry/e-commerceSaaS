'use client';

import { Copy, Download, QrCode, Share2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/misc';
import { useStoreQr } from '@/lib/queries';

export function ShareStore({ slug }: { slug: string }) {
  const [qrOpen, setQrOpen] = useState(false);
  const { data: qr, isPending } = useStoreQr(qrOpen);
  const url = typeof window !== 'undefined' ? `${window.location.origin}/s/${slug}` : `/s/${slug}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('تم نسخ رابط المتجر');
    } catch {
      toast.error('تعذر النسخ، انسخ الرابط يدوياً');
    }
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ url, title: 'متجري' });
      } catch {
        /* user dismissed */
      }
    } else {
      await copy();
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-n-200 bg-n-0 p-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-n-800">رابط متجرك</p>
        <p className="truncate text-sm text-brand-700" dir="ltr">
          {url}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={copy}>
          <Copy aria-hidden />
          نسخ
        </Button>
        <Button variant="secondary" size="sm" onClick={share}>
          <Share2 aria-hidden />
          مشاركة
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setQrOpen(true)} aria-label="رمز QR">
          <QrCode aria-hidden />
          QR
        </Button>
      </div>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent title="رمز QR لمتجرك" description="اطبعه وضعه في محلك أو على بطاقاتك.">
          <div className="flex flex-col items-center gap-4">
            {isPending || !qr ? (
              <Skeleton className="size-64" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr.dataUrl} alt={`رمز QR لرابط ${qr.url}`} className="size-64 rounded-md border border-n-200" />
            )}
            {qr && (
              <a href={qr.dataUrl} download={`qr-${slug}.png`} className="w-full">
                <Button block tabIndex={-1}>
                  <Download aria-hidden />
                  تنزيل الصورة
                </Button>
              </a>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
