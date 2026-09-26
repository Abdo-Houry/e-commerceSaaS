'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { categoryInputSchema, type CategoryDto } from '@matjari/shared';
import { ArrowDown, ArrowUp, FolderTree, ImageOff, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';
import { FormError } from '@/components/auth-card';
import { Button } from '@/components/ui/button';
import { ConfirmDialog, Dialog, DialogContent } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { ImageUpload } from '@/components/ui/image-upload';
import { Input } from '@/components/ui/input';
import { EmptyState, PageHeader, Skeleton } from '@/components/ui/misc';
import { apiError, getErrorMessage } from '@/lib/api';
import { useCategories, useCategoryMutations } from '@/lib/queries';
import { assetUrl } from '@/lib/utils';

type FormIn = z.input<typeof categoryInputSchema>;
type FormOut = z.output<typeof categoryInputSchema>;

function CategoryDialog({
  category,
  open,
  onOpenChange,
}: {
  category: CategoryDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { create, update } = useCategoryMutations();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setError: setFieldError,
    formState: { errors, isSubmitting },
  } = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(categoryInputSchema),
    values: { name: category?.name ?? '', imageUrl: category?.imageUrl ?? null },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      if (category) await update.mutateAsync({ id: category.id, ...values });
      else await create.mutateAsync(values);
      toast.success(category ? 'تم تحديث التصنيف' : 'تمت إضافة التصنيف');
      onOpenChange(false);
    } catch (err) {
      if (apiError(err)?.code === 'CATEGORY_EXISTS') setFieldError('name', { message: getErrorMessage(err) });
      else setError(getErrorMessage(err));
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={category ? 'تعديل التصنيف' : 'تصنيف جديد'} sheet>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <FormError message={error} />
          <Field label="اسم التصنيف" error={errors.name?.message}>
            <Input placeholder="مثال: ملابس" {...register('name')} />
          </Field>
          <Controller
            control={control}
            name="imageUrl"
            render={({ field }) => <ImageUpload label="صورة التصنيف (اختياري)" value={field.value} onChange={field.onChange} />}
          />
          <Button type="submit" block size="lg" loading={isSubmitting}>
            حفظ
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function CategoriesPage() {
  const { data, isPending } = useCategories();
  const { remove, reorder } = useCategoryMutations();
  const [editing, setEditing] = useState<CategoryDto | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<CategoryDto | null>(null);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function move(index: number, dir: -1 | 1) {
    if (!data) return;
    const ids = data.map((c) => c.id);
    const [id] = ids.splice(index, 1);
    ids.splice(index + dir, 0, id!);
    reorder.mutate(ids, { onError: (err) => toast.error(getErrorMessage(err)) });
  }

  return (
    <>
      <PageHeader
        title="التصنيفات"
        description="نظّم منتجاتك ليسهل على زبائنك التصفح"
        actions={
          <Button onClick={openCreate}>
            <Plus aria-hidden />
            تصنيف جديد
          </Button>
        }
      />

      {isPending ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : !data?.length ? (
        <EmptyState
          icon={<FolderTree />}
          title="أضف أول تصنيف"
          description="مثل: ملابس، إكسسوارات، عروض. التصنيفات الفارغة لا تظهر للزبائن."
          action={
            <Button onClick={openCreate}>
              <Plus aria-hidden />
              أضف أول تصنيف
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {data.map((c, i) => (
            <li key={c.id} className="flex items-center gap-2 rounded-lg border border-n-200 bg-n-0 p-2 sm:gap-3 sm:p-3">
              <div className="flex flex-col">
                <Button variant="ghost" size="icon" className="size-9 min-h-9" aria-label={`نقل ${c.name} للأعلى`} disabled={i === 0} onClick={() => move(i, -1)}>
                  <ArrowUp className="!size-4" aria-hidden />
                </Button>
                <Button variant="ghost" size="icon" className="size-9 min-h-9" aria-label={`نقل ${c.name} للأسفل`} disabled={i === data.length - 1} onClick={() => move(i, 1)}>
                  <ArrowDown className="!size-4" aria-hidden />
                </Button>
              </div>
              <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-n-100">
                {c.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={assetUrl(c.imageUrl)!} alt="" className="size-full object-cover" />
                ) : (
                  <ImageOff className="size-5 text-n-400" aria-hidden />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{c.name}</p>
                <p className="text-xs text-n-600">{c.productCount ?? 0} منتج</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`تعديل ${c.name}`}
                onClick={() => {
                  setEditing(c);
                  setDialogOpen(true);
                }}
              >
                <Pencil aria-hidden />
              </Button>
              <Button variant="danger-ghost" size="icon" aria-label={`حذف ${c.name}`} onClick={() => setDeleting(c)}>
                <Trash2 aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <CategoryDialog category={editing} open={dialogOpen} onOpenChange={setDialogOpen} />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`حذف «${deleting?.name ?? ''}»؟`}
        description="المنتجات داخل هذا التصنيف لن تُحذف، ستصبح بدون تصنيف."
        confirmLabel="حذف"
        destructive
        loading={remove.isPending}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await remove.mutateAsync(deleting.id);
            toast.success('تم حذف التصنيف');
            setDeleting(null);
          } catch (err) {
            toast.error(getErrorMessage(err));
          }
        }}
      />
    </>
  );
}
