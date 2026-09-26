import { SearchX } from 'lucide-react';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';

export default function StoreNotFound() {
  return (
    <main className="flex min-h-[70dvh] flex-col items-center justify-center gap-3 px-4 text-center">
      <SearchX className="size-12 text-n-400" aria-hidden />
      <h1 className="text-h2 font-bold text-n-900">غير موجود</h1>
      <p className="max-w-sm text-n-600">المتجر أو المنتج الذي تبحث عنه غير متاح حالياً. تأكد من الرابط.</p>
      <Link href="/" className={buttonVariants({ variant: 'secondary' })}>
        الصفحة الرئيسية
      </Link>
    </main>
  );
}
