'use client';

import { currencyInfo, toMajor, toMinor } from '@matjari/shared';
import { forwardRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface MoneyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  /** Integer minor units, or null when empty. */
  value: number | null | undefined;
  onChange: (minor: number | null) => void;
  currency: string;
}

/** The merchant types major units ("12.5"); the form value stays in integer minor units. */
export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ value, onChange, currency, className, ...props }, ref) => {
    const { symbol, decimals } = currencyInfo(currency);
    const [text, setText] = useState(value == null ? '' : String(toMajor(value, currency)));

    useEffect(() => {
      const current = text.trim() === '' ? null : toMinor(Number(text.replace(/,/g, '')), currency);
      if (current !== (value ?? null)) setText(value == null ? '' : String(toMajor(value, currency)));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, currency]);

    return (
      <div className="relative">
        <input
          ref={ref}
          inputMode={decimals ? 'decimal' : 'numeric'}
          dir="ltr"
          autoComplete="off"
          value={text}
          onChange={(e) => {
            // Accept Arabic-Indic digits too.
            const raw = e.target.value
              .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
              .replace(/[^\d.]/g, '');
            setText(raw);
            if (raw === '' || raw === '.') return onChange(null);
            const n = Number(raw);
            onChange(Number.isFinite(n) ? toMinor(n, currency) : null);
          }}
          className={cn(
            'min-h-12 w-full rounded-md border border-n-300 bg-n-0 ps-4 pe-14 text-end text-body-lg text-n-900 placeholder:text-n-500 hover:border-n-400 focus:border-brand-600 focus:ring-3 focus:ring-brand-100 focus:outline-none aria-invalid:border-danger',
            className,
          )}
          {...props}
        />
        <span className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-n-500">
          {symbol}
        </span>
      </div>
    );
  },
);
MoneyInput.displayName = 'MoneyInput';
