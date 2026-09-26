'use client';

import { STORE_TEMPLATE_LABELS, STORE_TEMPLATES, type StoreTemplate } from '@matjari/shared';
import { cn } from '@/lib/utils';

function Thumb({ template }: { template: StoreTemplate }) {
  const block = 'rounded-[3px] bg-n-200';
  return (
    <div className="flex aspect-[4/5] w-full flex-col gap-1 rounded-md bg-n-50 p-2" aria-hidden>
      <div className={cn('rounded-[3px] bg-(--thumb-brand)', template === 'visual' ? 'h-10' : 'h-5')} />
      {template === 'classic' && (
        <div className="grid flex-1 grid-cols-2 gap-1">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={block} />
          ))}
        </div>
      )}
      {template === 'visual' && (
        <div className="flex flex-1 flex-col gap-1">
          <div className={cn(block, 'flex-1')} />
          <div className={cn(block, 'flex-1')} />
        </div>
      )}
      {template === 'catalog' && (
        <div className="flex flex-1 flex-col gap-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-1 gap-1">
              <div className={cn(block, 'aspect-square h-full')} />
              <div className="flex-1 rounded-[3px] bg-n-100" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function TemplatePicker({
  value,
  onChange,
  brand,
}: {
  value: StoreTemplate;
  onChange: (t: StoreTemplate) => void;
  brand: string;
}) {
  return (
    <div role="radiogroup" aria-label="قالب المتجر" className="grid grid-cols-3 gap-2 sm:gap-3">
      {STORE_TEMPLATES.map((t) => (
        <button
          key={t}
          type="button"
          role="radio"
          aria-checked={value === t}
          onClick={() => onChange(t)}
          style={{ '--thumb-brand': brand } as React.CSSProperties}
          className={cn(
            'flex cursor-pointer flex-col gap-2 rounded-lg border-2 bg-n-0 p-2 text-start transition-colors',
            value === t ? 'border-brand-600 bg-brand-50' : 'border-n-200 hover:border-n-300',
          )}
        >
          <Thumb template={t} />
          <span className="text-sm font-bold text-n-900">{STORE_TEMPLATE_LABELS[t].name}</span>
          <span className="hidden text-caption text-n-600 sm:block">{STORE_TEMPLATE_LABELS[t].description}</span>
        </button>
      ))}
    </div>
  );
}
