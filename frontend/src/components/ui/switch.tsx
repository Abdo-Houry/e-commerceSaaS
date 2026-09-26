'use client';

import { cn } from '@/lib/utils';

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  className?: string;
  /** Hide the visible label (still announced to screen readers). */
  hideLabel?: boolean;
}

export function Switch({ checked, onCheckedChange, label, description, disabled, className, hideLabel }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={hideLabel ? label : undefined}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'group flex min-h-11 cursor-pointer items-center gap-3 text-start disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
    >
      <span
        className={cn(
          'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors',
          checked ? 'bg-brand-600' : 'bg-n-300',
        )}
      >
        <span
          className={cn(
            'absolute top-1 size-5 rounded-full bg-n-0 shadow transition-all',
            checked ? 'start-6' : 'start-1',
          )}
        />
      </span>
      {!hideLabel && (
        <span className="flex flex-col">
          <span className="text-sm font-semibold text-n-800">{label}</span>
          {description && <span className="text-xs text-n-600">{description}</span>}
        </span>
      )}
    </button>
  );
}
