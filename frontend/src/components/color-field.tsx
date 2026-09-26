'use client';

import { HEX_COLOR_RE } from '@matjari/shared';
import { useEffect, useId, useState } from 'react';

const PRESETS = ['#059669', '#0F766E', '#2563EB', '#7C3AED', '#DB2777', '#DC2626', '#EA580C', '#F59E0B', '#1C1917'];

export function ColorField({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
  error?: string;
}) {
  const id = useId();
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-n-800">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} — منتقي الألوان`}
          value={HEX_COLOR_RE.test(value) ? value : '#000000'}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="size-12 shrink-0 cursor-pointer rounded-md border border-n-300 bg-n-0 p-1"
        />
        <input
          id={id}
          dir="ltr"
          value={text}
          maxLength={7}
          onChange={(e) => {
            const v = e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`;
            setText(v);
            if (HEX_COLOR_RE.test(v)) onChange(v.toUpperCase());
          }}
          aria-invalid={error ? true : undefined}
          className="min-h-12 w-28 rounded-md border border-n-300 bg-n-0 px-3 font-mono text-sm uppercase focus:border-brand-600 focus:ring-3 focus:ring-brand-100 focus:outline-none"
        />
      </div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={`ألوان جاهزة — ${label}`}>
        {PRESETS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={c}
            aria-pressed={value.toUpperCase() === c}
            onClick={() => onChange(c)}
            className="size-8 cursor-pointer rounded-full border-2 border-n-0 ring-1 ring-n-300 aria-pressed:ring-2 aria-pressed:ring-n-900"
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      {error && <p role="alert" className="text-xs font-medium text-[#B91C1C]">{error}</p>}
    </div>
  );
}
