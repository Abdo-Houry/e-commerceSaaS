'use client';

import type { SlugAvailability } from '@matjari/shared';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { forwardRef } from 'react';
import { useDebouncedValue } from '@/hooks/use-debounce';
import { api, unwrap } from '@/lib/api';
import { SITE_URL } from '@/lib/env';
import { cn } from '@/lib/utils';

/** Live availability for a slug, debounced. Returns null until there is something to check. */
export function useSlugAvailability(slug: string) {
  const debounced = useDebouncedValue(slug.trim().toLowerCase(), 400);
  const query = useQuery({
    queryKey: ['slug-available', debounced],
    queryFn: () => unwrap<SlugAvailability>(api.get('/store/slug-available', { params: { slug: debounced } })),
    enabled: debounced.length >= 3,
    staleTime: 10_000,
  });
  const settled = debounced === slug.trim().toLowerCase();
  return { data: settled ? query.data : undefined, checking: !settled || query.isFetching };
}

export const SlugInput = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { availability: ReturnType<typeof useSlugAvailability>; value: string }
>(({ availability, value, className, ...props }, ref) => {
  const host = SITE_URL.replace(/^https?:\/\//, '');
  const show = value.trim().length >= 3;
  return (
    <div>
      <div
        dir="ltr"
        className={cn(
          'flex min-h-12 items-stretch overflow-hidden rounded-md border border-n-300 bg-n-0 focus-within:border-brand-600 focus-within:ring-3 focus-within:ring-brand-100',
          props['aria-invalid'] && 'border-danger',
          className,
        )}
      >
        <span className="flex items-center bg-n-100 px-3 text-sm text-n-600 select-none">{host}/s/</span>
        <input
          ref={ref}
          value={value}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="min-w-0 flex-1 bg-transparent px-3 text-body-lg outline-none"
          {...props}
        />
        <span className="flex w-11 items-center justify-center" aria-hidden>
          {show && availability.checking && <Loader2 className="size-5 animate-spin text-n-500" />}
          {show && !availability.checking && availability.data?.available && <CheckCircle2 className="size-5 text-success" />}
          {show && !availability.checking && availability.data && !availability.data.available && (
            <XCircle className="size-5 text-danger" />
          )}
        </span>
      </div>
      <p aria-live="polite" className="mt-1 min-h-5 text-xs">
        {show && !availability.checking && availability.data?.available && (
          <span className="font-medium text-brand-700">الرابط متاح ✓</span>
        )}
        {show && !availability.checking && availability.data && !availability.data.available && (
          <span className="font-medium text-[#B91C1C]">{availability.data.reason}</span>
        )}
      </p>
    </div>
  );
});
SlugInput.displayName = 'SlugInput';
