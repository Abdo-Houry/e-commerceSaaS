'use client';

import { ArrowRight, ExternalLink, PackageX, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use, useState } from 'react';
import { toast } from 'sonner';
import { ProductForm } from '@/components/dashboard/product-form';
import { Button, buttonVariants } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/dialog';
import { EmptyState, PageHeader, Skeleton } from '@/components/ui/misc';
import { getErrorMessage } from '@/lib/api';
import { useMe } from '@/lib/auth';
import { useProduct, useProductMutations } from '@/lib/queries';

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const store = useMe().data?.store;
  const { data: product, isPending, error: loadError } = useProduct(id);
  const { update, remove } = useProductMutations();
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (isPending) {
    return (
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-64 lg:col-span-2" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (loadError || !product) {
    return (
      <EmptyState
        icon={<PackageX />}
        title="المنتج غير موجود"
        action={
          <Link href="/dashboard/products" className={buttonVariants()}>
            العودة للمنتجات
          </Link>
        }
      />
    );
  }

  return (
    <>
      <Link href="/dashboard/products" className="mb-3 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-n-600 hover:text-n-900">
        <ArrowRight className="size-4" aria-hidden />
        المنتجات
      </Link>
      <PageHeader
        title="تعديل المنتج"
        description={product.name}
        actions={
          store && (
            <a href={`/s/${store.slug}/product/${product.id}`} target="_blank" rel="noreferrer" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
              <ExternalLink aria-hidden />
              عرض في المتجر
            </a>
          )
        }
      />
      <ProductForm
        key={product.updatedAt}
        product={product}
        currency={store?.currency ?? 'SYP'}
        submitLabel="حفظ التغييرات"
        error={error}
        onSubmit={async (values) => {
          setError(null);
          try {
            await update.mutateAsync({ id, ...values });
            toast.success('تم حفظ التغييرات');
          } catch (err) {
            setError(getErrorMessage(err));
          }
        }}
        footer={
          <Button variant="danger-ghost" block onClick={() => setConfirmDelete(true)}>
            <Trash2 aria-hidden />
            حذف المنتج
          </Button>
        }
      />
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="حذف المنتج؟"
        description="سيختفي المنتج من متجرك. الطلبات السابقة لن تتأثر."
        confirmLabel="حذف"
        destructive
        loading={remove.isPending}
        onConfirm={async () => {
          try {
            await remove.mutateAsync(id);
            toast.success('تم حذف المنتج');
            router.replace('/dashboard/products');
          } catch (err) {
            toast.error(getErrorMessage(err));
          }
        }}
      />
    </>
  );
}
