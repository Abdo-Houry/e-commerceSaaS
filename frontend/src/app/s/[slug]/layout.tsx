import { Store } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DEMO_STORE_SLUG } from '@matjari/shared';
import { CartBar, CartLink } from '@/components/storefront/cart-widgets';
import { DemoBar } from '@/components/storefront/demo-bar';
import { PreviewBridge } from '@/components/storefront/preview-bridge';
import { StoreFooter } from '@/components/storefront/store-footer';
import { StorefrontProvider } from '@/components/storefront/storefront-context';
import { almarai, tajawal } from '@/lib/fonts';
import { getStore } from '@/lib/public-api';
import { themeVars } from '@/lib/store-theme';
import { assetUrl, cn } from '@/lib/utils';

export const revalidate = 60;

// Storefronts render on first visit, then are cached and refreshed (ISR).
export function generateStaticParams() {
  return [];
}

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const store = await getStore(slug);
  if (!store) return { title: 'المتجر غير موجود' };
  const image = assetUrl(store.bannerUrl ?? store.logoUrl);
  const description = store.description ?? `تسوّق من ${store.name} واطلب مباشرة عبر واتساب.`;
  return {
    title: { absolute: store.name, template: `%s | ${store.name}` },
    description,
    applicationName: store.name,
    icons: store.faviconUrl ? { icon: assetUrl(store.faviconUrl)! } : undefined,
    alternates: { canonical: `/s/${store.slug}` },
    openGraph: {
      type: 'website',
      locale: 'ar_SY',
      siteName: store.name,
      title: store.name,
      description,
      url: `/s/${store.slug}`,
      images: image ? [{ url: image, alt: store.name }] : undefined,
    },
    twitter: { card: image ? 'summary_large_image' : 'summary', title: store.name, description },
  };
}

export default async function StorefrontLayout({ children, params }: Params & { children: React.ReactNode }) {
  const { slug } = await params;
  const store = await getStore(slug);
  if (!store) notFound();

  const logo = assetUrl(store.logoUrl);

  return (
    <div
      data-store-root
      data-template={store.template}
      className={cn(tajawal.variable, almarai.variable, 'flex min-h-dvh flex-col bg-n-50')}
      style={{ ...themeVars(store), fontFamily: 'var(--store-font)' } as React.CSSProperties}
    >
      <StorefrontProvider
        store={{
          name: store.name,
          slug: store.slug,
          currency: store.currency,
          whatsappNumber: store.whatsappNumber,
          minOrderAmount: store.minOrderAmount,
          deliveryZones: store.deliveryZones,
        }}
      >
        {store.slug === DEMO_STORE_SLUG && <DemoBar initial={store.template} />}
        <header className="sticky top-0 z-30 border-b border-n-200 bg-n-0/95 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
            <Link href={`/s/${store.slug}`} className="flex min-w-0 items-center gap-2.5">
              <span className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-store-strong text-n-0">
                {logo ? (
                  <Image src={logo} alt="" fill sizes="40px" className="object-cover" />
                ) : (
                  <Store className="size-5" aria-hidden />
                )}
              </span>
              <span className="truncate text-body-lg font-bold text-n-900">{store.name}</span>
            </Link>
            <CartLink />
          </div>
        </header>

        <div className="flex-1">{children}</div>

        <StoreFooter store={store} />
        <CartBar />
        <PreviewBridge />
      </StorefrontProvider>
    </div>
  );
}
