'use client';

import { ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { assetUrl, cn } from '@/lib/utils';

/**
 * Swipeable main image (scroll-snap, no library) with thumbnails, dots and
 * arrows, so every uploaded photo is visibly reachable on phones and desktop.
 */
export function ProductGallery({ images, name, badge }: { images: string[]; name: string; badge?: React.ReactNode }) {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const urls = images.map((i) => assetUrl(i)!).filter(Boolean);
  const count = urls.length;

  const goTo = useCallback((index: number) => {
    const root = track.current;
    if (!root) return;
    // In RTL, scrollLeft runs from 0 towards negative values.
    const sign = getComputedStyle(root).direction === 'rtl' ? -1 : 1;
    root.scrollTo({ left: sign * index * root.clientWidth, behavior: 'smooth' });
    setActive(index);
  }, []);

  // Track which slide is centred, whatever the scroll direction (RTL scrollLeft is negative in most browsers).
  useEffect(() => {
    const root = track.current;
    if (!root || count < 2) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.index));
        }
      },
      { root, threshold: 0.6 },
    );
    Array.from(root.children).forEach((c) => observer.observe(c));
    return () => observer.disconnect();
  }, [count]);

  if (!count) {
    return (
      <div className="relative flex aspect-square items-center justify-center rounded-xl bg-store-soft text-store">
        <ImageIcon className="size-16 opacity-50" aria-hidden />
        {badge}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <div
          ref={track}
          className="flex snap-x snap-mandatory overflow-x-auto rounded-xl scrollbar-none"
          aria-roledescription="معرض صور"
          aria-label={`صور ${name}`}
        >
          {urls.map((src, i) => (
            <div
              key={src}
              data-index={i}
              className="relative aspect-square w-full shrink-0 snap-center bg-store-soft"
              aria-roledescription="صورة"
              aria-label={`${i + 1} من ${count}`}
            >
              <Image
                src={src}
                alt={i === 0 ? name : `${name} — صورة ${i + 1}`}
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                priority={i === 0}
                className="object-cover"
              />
            </div>
          ))}
        </div>

        {badge}

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => goTo(Math.max(0, active - 1))}
              disabled={active === 0}
              aria-label="الصورة السابقة"
              className="absolute top-1/2 start-2 flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-n-0/90 text-n-900 shadow-md backdrop-blur transition-opacity hover:bg-n-0 disabled:pointer-events-none disabled:opacity-0"
            >
              <ChevronRight className="size-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => goTo(Math.min(count - 1, active + 1))}
              disabled={active === count - 1}
              aria-label="الصورة التالية"
              className="absolute top-1/2 end-2 flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-n-0/90 text-n-900 shadow-md backdrop-blur transition-opacity hover:bg-n-0 disabled:pointer-events-none disabled:opacity-0"
            >
              <ChevronLeft className="size-5" aria-hidden />
            </button>
            <span className="absolute bottom-3 start-3 rounded-full bg-n-900/70 px-2.5 py-0.5 text-caption font-semibold text-n-0 tabular-nums" aria-live="polite">
              {active + 1} / {count}
            </span>
          </>
        )}
      </div>

      {count > 1 && (
        <ul className="flex gap-2 overflow-x-auto pb-1 scrollbar-none" aria-label="الصور المصغّرة">
          {urls.map((src, i) => (
            <li key={src} className="shrink-0">
              <button
                type="button"
                onClick={() => goTo(i)}
                aria-label={`عرض الصورة ${i + 1}`}
                aria-current={active === i}
                className={cn(
                  'relative block size-16 cursor-pointer overflow-hidden rounded-md border-2 transition-all sm:size-20',
                  active === i ? 'border-store-strong' : 'border-transparent opacity-70 hover:opacity-100',
                )}
              >
                <Image src={src} alt="" fill sizes="80px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
