'use client';

import { ArrowRight, PartyPopper } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { toast } from 'sonner';
import { ProductForm } from '@/components/dashboard/product-form';
import { PageHeader } from '@/components/ui/misc';
import { getErrorMessage } from '@/lib/api';
import { useMe } from '@/lib/auth';
import { useProductMutations } from '@/lib/queries';

function NewProduct() {
  const router = useRouter();
  const first = useSearchParams().get('first') === '1';
  const currency = useMe().data?.store?.currency ?? 'SYP';
  const { create } = useProductMutations();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <Link href="/dashboard/products" className="mb-3 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-n-600 hover:text-n-900">
        <ArrowRight className="size-4" aria-hidden />
        المنتجات
      </Link>
      {first && (
        <div className="mb-4 flex items-start gap-3 rounded-lg bg-brand-50 p-4 text-brand-900">
          <PartyPopper className="size-6 shrink-0 text-brand-700" aria-hidden />
          <div>
            <p className="font-bold">متجرك جاهز!</p>
            <p className="text-sm">أضف أول منتج ليظهر لزبائنك.</p>
          </div>
        </div>
      )}
      <PageHeader title={first ? 'أضف أول منتج' : 'منتج جديد'} />
      <ProductForm
        currency={currency}
        submitLabel="حفظ المنتج"
        error={error}
        onSubmit={async (values) => {
          setError(null);
          try {
            await create.mutateAsync(values);
            toast.success('تمت إضافة المنتج');
            router.push('/dashboard/products');
          } catch (err) {
            setError(getErrorMessage(err));
          }
        }}
      />
    </>
  );
}

export default function NewProductPage() {
  return (
    <Suspense>
      <NewProduct />
    </Suspense>
  );
}
