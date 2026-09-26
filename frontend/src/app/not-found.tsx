import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-display font-bold text-brand-700">404</p>
      <h1 className="text-h2 font-bold text-n-900">الصفحة غير موجودة</h1>
      <p className="max-w-sm text-n-600">ربما تم نقل الصفحة أو حذفها، أو أن الرابط غير صحيح.</p>
      <Link href="/" className={buttonVariants()}>
        العودة للرئيسية
      </Link>
    </main>
  );
}
