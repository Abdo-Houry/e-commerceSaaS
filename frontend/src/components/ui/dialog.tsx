'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  title,
  description,
  children,
  className,
  sheet,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  /** Bottom sheet on mobile, centered dialog from sm up. */
  sheet?: boolean;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-n-900/50 backdrop-blur-[2px]" />
      <DialogPrimitive.Content
        dir="rtl"
        className={cn(
          'fixed z-50 flex max-h-[90dvh] flex-col overflow-hidden bg-n-0 shadow-xl focus:outline-none',
          sheet
            ? 'inset-x-0 bottom-0 rounded-t-xl pb-safe sm:inset-x-4 sm:bottom-auto sm:top-1/2 sm:mx-auto sm:max-w-lg sm:-translate-y-1/2 sm:rounded-xl'
            : 'inset-x-4 top-1/2 mx-auto w-auto -translate-y-1/2 rounded-xl sm:max-w-lg',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-n-200 px-5 py-4">
          <div>
            <DialogPrimitive.Title className="text-h3 font-bold text-n-900">{title}</DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="mt-1 text-sm text-n-600">{description}</DialogPrimitive.Description>
            ) : (
              <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
            )}
          </div>
          <DialogPrimitive.Close asChild>
            <Button variant="ghost" size="icon" aria-label="إغلاق" className="-me-2 -mt-1">
              <X />
            </Button>
          </DialogPrimitive.Close>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'تأكيد',
  destructive,
  loading,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={title}>
        <p className="text-body text-n-700">{description}</p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <DialogClose asChild>
            <Button variant="secondary">إلغاء</Button>
          </DialogClose>
          <Button variant={destructive ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
