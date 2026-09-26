'use client';

import { STORE_TEMPLATE_LABELS, STORE_TEMPLATES, type StoreTemplate } from '@matjari/shared';
import { Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { cn } from '@/lib/utils';

/** Shown only on the showcase store: lets visitors flip between the three templates live. */
export function DemoBar({ initial }: { initial: StoreTemplate }) {
  const [template, setTemplate] = useState(initial);

  function choose(t: StoreTemplate) {
    setTemplate(t);
    const root = document.querySelector<HTMLElement>('[data-store-root]');
    if (root) root.dataset.template = t;
  }

  return (
    <div className="bg-n-900 text-n-0">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold sm:text-sm">
          <Sparkles className="size-4 text-accent-500" aria-hidden />
          متجر تجريبي — جرّب القوالب:
        </p>
        <div className="flex items-center gap-1" role="radiogroup" aria-label="قالب المتجر">
          {STORE_TEMPLATES.map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={template === t}
              onClick={() => choose(t)}
              className={cn(
                'min-h-9 cursor-pointer rounded-full px-3 text-xs font-bold transition-colors',
                template === t ? 'bg-n-0 text-n-900' : 'text-n-300 hover:bg-n-0/10 hover:text-n-0',
              )}
            >
              {STORE_TEMPLATE_LABELS[t].name}
            </button>
          ))}
          <Link href="/register" className="ms-1 inline-flex min-h-9 items-center rounded-full bg-brand-500 px-3 text-xs font-bold text-n-900 hover:bg-brand-400">
            أنشئ متجرك
          </Link>
        </div>
      </div>
    </div>
  );
}
