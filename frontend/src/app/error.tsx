'use client';

import { RotateCw } from 'lucide-react';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[70dvh] flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-display font-bold text-danger">500</p>
      <h1 className="text-h2 font-bold text-n-900">حدث خطأ غير متوقع</h1>
      <p className="max-w-sm text-n-600">نعتذر عن ذلك. حاول مرة أخرى، وإذا تكررت المشكلة عُد لاحقاً.</p>
      <Button onClick={reset}>
        <RotateCw aria-hidden />
        إعادة المحاولة
      </Button>
    </main>
  );
}
