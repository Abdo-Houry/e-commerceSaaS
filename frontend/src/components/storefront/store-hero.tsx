import type { PublicStoreDto } from '@matjari/shared';
import { Banknote, Clock, MapPin, MessageCircle, ShoppingBag, Store, Truck } from 'lucide-react';
import Image from 'next/image';
import { assetUrl, waLink } from '@/lib/utils';

/*
 * One hero, three moods driven by data-template:
 *  classic — rounded card with the brand gradient (or banner photo)
 *  visual  — tall, full-bleed, photo-forward
 *  catalog — compact header strip that gets out of the way of the list
 * Colours come only from CSS variables, so any merchant palette works.
 */

const gradient = {
  backgroundImage: [
    'radial-gradient(60% 80% at 100% 0%, color-mix(in oklab, var(--accent) 55%, transparent) 0%, transparent 60%)',
    'radial-gradient(50% 70% at 0% 100%, color-mix(in oklab, var(--brand) 70%, white 10%) 0%, transparent 65%)',
    'linear-gradient(135deg, var(--brand-strong) 0%, color-mix(in oklab, var(--brand-strong) 70%, black) 100%)',
  ].join(','),
} as React.CSSProperties;

export function StoreHero({ store, productCount }: { store: PublicStoreDto; productCount: number }) {
  const banner = assetUrl(store.bannerUrl);
  const logo = assetUrl(store.logoUrl);
  const title = store.bannerTitle || store.name;
  const subtitle = store.bannerSubtitle || store.description;
  const zones = store.deliveryZones.length;

  const chips = [
    store.city && { icon: MapPin, text: store.city },
    store.businessHours.summary && { icon: Clock, text: store.businessHours.summary },
    zones > 0 && { icon: Truck, text: zones === 1 ? 'توصيل متاح' : `توصيل لـ ${zones} مناطق` },
    { icon: Banknote, text: 'الدفع عند الاستلام' },
  ].filter(Boolean) as { icon: typeof MapPin; text: string }[];

  return (
    <section
      aria-label={store.name}
      className="mx-auto max-w-6xl px-4 pt-4 tpl-visual:max-w-none tpl-visual:px-0 tpl-visual:pt-0 tpl-catalog:pt-3"
    >
      <div
        className="relative isolate overflow-hidden rounded-2xl text-n-0 shadow-lg tpl-catalog:rounded-xl tpl-catalog:shadow-sm tpl-visual:rounded-none tpl-visual:shadow-none"
        style={banner ? undefined : gradient}
      >
        {banner ? (
          <>
            <Image src={banner} alt="" fill priority sizes="(min-width: 1152px) 1152px, 100vw" className="-z-20 object-cover" />
            <div className="absolute inset-0 -z-10 bg-gradient-to-t from-n-900/90 via-n-900/50 to-n-900/10" />
          </>
        ) : (
          // Soft decorative shapes over the brand gradient.
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute -top-16 -end-10 size-56 rounded-full border-[28px] border-n-0/10 tpl-catalog:hidden" />
            <div className="absolute -bottom-20 start-1/3 size-64 rounded-full bg-n-0/5 blur-2xl" />
            <div
              className="absolute inset-0 opacity-[0.07]"
              style={{ backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)', backgroundSize: '18px 18px' }}
            />
          </div>
        )}

        <div className="flex min-h-64 flex-col justify-end gap-5 p-6 sm:min-h-72 sm:p-10 tpl-catalog:min-h-0 tpl-catalog:flex-row tpl-catalog:items-center tpl-catalog:justify-start tpl-catalog:gap-4 tpl-catalog:p-5 tpl-visual:mx-auto tpl-visual:min-h-[78vw] tpl-visual:max-w-6xl tpl-visual:px-5 tpl-visual:pt-24 tpl-visual:pb-10 md:tpl-visual:min-h-[520px]">
          <span className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-n-0 text-store-strong shadow-xl ring-4 ring-n-0/25 sm:size-20 tpl-catalog:size-14 tpl-catalog:rounded-xl">
            {logo ? <Image src={logo} alt="" fill sizes="80px" className="object-cover" /> : <Store className="size-8" aria-hidden />}
          </span>

          <div className="flex max-w-2xl flex-col gap-2">
            <h1
              className="text-h1 leading-tight font-bold text-balance drop-shadow-sm sm:text-display tpl-catalog:text-h2 tpl-visual:text-[40px] md:tpl-visual:text-[56px] md:tpl-visual:leading-[1.15]"
              data-preview="bannerTitle"
              data-fallback={store.name}
            >
              {title}
            </h1>
            <p
              className="text-body-lg text-pretty text-n-0/90 tpl-catalog:text-sm"
              data-preview="bannerSubtitle"
              data-fallback={store.description ?? ''}
              hidden={!subtitle}
            >
              {subtitle}
            </p>
          </div>

          <ul className="flex flex-wrap gap-2" aria-label="معلومات المتجر">
            {chips.map((c) => (
              <li
                key={c.text}
                className="inline-flex items-center gap-1.5 rounded-full bg-n-0/15 px-3 py-1.5 text-xs font-semibold text-n-0 ring-1 ring-n-0/20 backdrop-blur-sm tpl-catalog:py-1"
              >
                <c.icon className="size-3.5" aria-hidden />
                {c.text}
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-3 tpl-catalog:hidden">
            {productCount > 0 && (
              <a
                href="#products"
                className="inline-flex min-h-12 items-center gap-2 rounded-full bg-n-0 px-6 font-bold text-store-strong shadow-lg transition-transform hover:-translate-y-0.5"
              >
                <ShoppingBag className="size-5" aria-hidden />
                تسوّق الآن
              </a>
            )}
            <a
              href={waLink(store.whatsappNumber)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-n-0/15 px-6 font-bold text-n-0 ring-1 ring-n-0/40 backdrop-blur-sm transition-colors hover:bg-n-0/25"
            >
              <MessageCircle className="size-5" aria-hidden />
              راسلنا
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
