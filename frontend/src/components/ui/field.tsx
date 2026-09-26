'use client';

import * as LabelPrimitive from '@radix-ui/react-label';
import { ChevronDown } from 'lucide-react';
import { cloneElement, isValidElement, useId } from 'react';
import { cn } from '@/lib/utils';

export function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return <LabelPrimitive.Root className={cn('text-sm font-semibold text-n-800', className)} {...props} />;
}

interface FieldProps {
  label: string;
  error?: string;
  hint?: React.ReactNode;
  optional?: boolean;
  className?: string;
  /** Wraps a native <select> with a chevron. */
  select?: boolean;
  children: React.ReactElement<{ id?: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }>;
}

/** Label + control + inline error. Errors are always shown under the field, never only in a toast. */
export function Field({ label, error, hint, optional, className, select, children }: FieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;

  const control = isValidElement(children)
    ? cloneElement(children, { id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })
    : children;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={id}>
        {label}
        {optional && <span className="ms-1 font-normal text-n-500">(اختياري)</span>}
      </Label>
      {select ? (
        <div className="relative">
          {control}
          <ChevronDown className="pointer-events-none absolute end-3 top-1/2 size-5 -translate-y-1/2 text-n-500" aria-hidden />
        </div>
      ) : (
        control
      )}
      {hint && !error && (
        <p id={hintId} className="text-xs text-n-600">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-[#B91C1C]">
          {error}
        </p>
      )}
    </div>
  );
}
