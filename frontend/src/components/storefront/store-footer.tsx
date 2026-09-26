import { formatMoney, type PublicStoreDto } from '@matjari/shared';
import { Banknote, Clock, MapPin, MessageCircle, Phone, Store, Truck } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { assetUrl, waLink } from '@/lib/utils';

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" aria-hidden>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function TiktokIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5" />
      <path d="M14 3c.4 2.6 2.3 4.5 5 4.8" />
    </svg>
  );
}

const SOCIAL = {
  instagram: { label: 'إنستغرام', Icon: InstagramIcon },
  facebook: { label: 'فيسبوك', Icon: FacebookIcon },
  tiktok: { label: 'تيك توك', Icon: TiktokIcon },
} as const;

function safeUrl(url: string): string | null {
  const withProtocol = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  try {
    return new URL(withProtocol).toString();
  } catch {
    return null;
  }
}

export function StoreFooter({ store }: { store: PublicStoreDto }) {
  const logo = assetUrl(store.logoUrl);
  const social = (Object.keys(SOCIAL) as (keyof typeof SOCIAL)[])
    .map((key) => ({ key, url: store.socialLinks[key] ? safeUrl(store.socialLinks[key]) : null }))
    .filter((s): s is { key: keyof typeof SOCIAL; url: string } => !!s.url);
  const zones = store.deliveryZones;
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 bg-n-900 text-n-300">
      <div className="h-1 bg-store" aria-hidden />
      <div className="mx-auto grid max-w-6xl gap-10 px-4 pt-12 pb-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="flex flex-col gap-4">
          <Link href={`/s/${store.slug}`} className="flex w-fit items-center gap-3">
            <span className="relative flex size-12 items-center justify-center overflow-hidden rounded-xl bg-n-0 text-store-strong">
              {logo ? <Image src={logo} alt="" fill sizes="48px" className="object-cover" /> : <Store className="size-6" aria-hidden />}
            </span>
            <span className="text-h3 font-bold text-n-0">{store.name}</span>
          </Link>
          {store.description && <p className="max-w-sm text-sm leading-relaxed">{store.description}</p>}
          <ul className="flex flex-col gap-2 text-sm">
            {store.city && (
              <li className="flex items-center gap-2">
                <MapPin className="size-4 shrink-0 text-n-400" aria-hidden />
                {store.city}
              </li>
            )}
            {store.businessHours.summary && (
              <li className="flex items-center gap-2">
                <Clock className="size-4 shrink-0 text-n-400" aria-hidden />
                {store.businessHours.summary}
              </li>
            )}
            <li className="flex items-center gap-2">
              <Banknote className="size-4 shrink-0 text-n-400" aria-hidden />
              الدفع نقداً عند الاستلام
            </li>
          </ul>
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="font-bold text-n-0">تواصل معنا</h2>
          <ul className="flex flex-col gap-2 text-sm">
            <li>
              <a href={`tel:+${store.whatsappNumber}`} className="flex w-fit items-center gap-2 hover:text-n-0">
                <Phone className="size-4 shrink-0 text-n-400" aria-hidden />
                <span dir="ltr">+{store.whatsappNumber}</span>
              </a>
            </li>
            <li>
              <a href={waLink(store.whatsappNumber)} target="_blank" rel="noreferrer" className="flex w-fit items-center gap-2 hover:text-n-0">
                <MessageCircle className="size-4 shrink-0 text-n-400" aria-hidden />
                راسلنا على واتساب
              </a>
            </li>
          </ul>
          {social.length > 0 && (
            <ul className="flex gap-2" aria-label="حساباتنا">
              {social.map(({ key, url }) => {
                const { label, Icon } = SOCIAL[key];
                return (
                  <li key={key}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={label}
                      className="flex size-11 items-center justify-center rounded-full bg-n-0/10 text-n-0 transition-colors hover:bg-store"
                    >
                      <Icon />
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {zones.length > 0 && (
          <div className="flex flex-col gap-4">
            <h2 className="flex items-center gap-2 font-bold text-n-0">
              <Truck className="size-5" aria-hidden />
              مناطق التوصيل
            </h2>
            {/* Fixed height of three zones; longer lists scroll so the footer never grows. */}
            <ul
              className="flex max-h-44 flex-col gap-2 overflow-y-auto pe-2 text-sm scrollbar-dark"
              tabIndex={zones.length > 3 ? 0 : undefined}
              aria-label="مناطق التوصيل"
            >
              {zones.map((z) => (
                <li key={z.id} className="flex min-h-13 shrink-0 items-center justify-between gap-3 border-b border-n-0/10 pb-2">
                  <span>
                    {z.name}
                    {z.estimatedTime && <span className="block text-xs text-n-400">{z.estimatedTime}</span>}
                  </span>
                  <span className="font-semibold whitespace-nowrap text-n-0">{z.fee === 0 ? 'مجاني' : formatMoney(z.fee, store.currency)}</span>
                </li>
              ))}
            </ul>
            {zones.length > 3 && <p className="-mt-2 text-xs text-n-400">اسحب لرؤية كل المناطق ({zones.length})</p>}
          </div>
        )}
      </div>

      <div className="border-t border-n-0/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 pb-24 text-xs text-n-400 sm:flex-row md:pb-5">
          <p>
            © {year} {store.name}. جميع الحقوق محفوظة.
          </p>
          <p>
            متجر مبني على{' '}
            <Link href="/" className="font-semibold text-n-0 underline-offset-4 hover:underline">
              متجري
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
