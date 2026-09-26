'use client';

import { RotateCw, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-n-200 bg-n-0 px-6 py-16 text-center">
      <TriangleAlert className="size-10 text-danger" aria-hidden />
      <h1 className="text-h3 font-bold">تعذر تحميل هذه الصفحة</h1>
      <p className="text-sm text-n-600">تحقق من اتصالك بالإنترنت ثم حاول مجدداً.</p>
      <Button onClick={reset}>
        <RotateCw aria-hidden />
        إعادة المحاولة
      </Button>
    </div>
  );
}
