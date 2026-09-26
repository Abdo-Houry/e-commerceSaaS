import { formatMoney } from '@matjari/shared';
import { ArrowRight, Truck } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AddToCart } from '@/components/storefront/add-to-cart';
import { ProductGallery } from '@/components/storefront/product-gallery';
import { DiscountBadge, discountPercent, StockNote } from '@/components/storefront/stock-and-discount';
import { getProduct, getStore } from '@/lib/public-api';
import { assetUrl } from '@/lib/utils';

export const revalidate = 60;

export function generateStaticParams() {
  return [];
}

type Params = { params: Promise<{ slug: string; id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug, id } = await params;
  const [store, product] = await Promise.all([getStore(slug), getProduct(slug, id)]);
  if (!store || !product) return { title: 'المنتج غير موجود' };
  const description = product.description?.slice(0, 160) ?? `${product.name} — ${formatMoney(product.price, store.currency)}. اطلب الآن عبر واتساب.`;
  const image = assetUrl(product.images[0]);
  return {
    title: product.name,
    description,
    alternates: { canonical: `/s/${slug}/product/${id}` },
    openGraph: {
      type: 'website',
      title: `${product.name} | ${store.name}`,
      description,
      url: `/s/${slug}/product/${id}`,
      images: image ? [{ url: image, alt: product.name }] : undefined,
    },
    twitter: { card: image ? 'summary_large_image' : 'summary' },
  };
}

export default async function ProductPage({ params }: Params) {
  const { slug, id } = await params;
  const [store, product] = await Promise.all([getStore(slug), getProduct(slug, id)]);
  if (!store || !product) notFound();

  const percent = discountPercent(product.price, product.comparePrice);
  const category = store.categories.find((c) => c.id === product.categoryId);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description ?? undefined,
    image: product.images.map((i) => assetUrl(i)),
    offers: {
      '@type': 'Offer',
      priceCurrency: store.currency,
      price: product.price,
      availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  };

  return (
    <main className="mx-auto max-w-6xl px-4 pt-3">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <nav aria-label="مسار التنقل" className="mb-3">
        <Link href={`/s/${slug}`} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-n-700 hover:text-n-900">
          <ArrowRight className="size-4" aria-hidden />
          {category ? category.name : 'كل المنتجات'}
        </Link>
      </nav>

      <div className="grid gap-6 md:grid-cols-2 md:gap-10">
        <ProductGallery
          images={product.images}
          name={product.name}
          badge={<DiscountBadge percent={percent} className="absolute top-3 end-3 text-sm" />}
        />

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            {category && <span className="text-sm font-semibold text-store-strong">{category.name}</span>}
            <h1 className="text-h2 font-bold text-n-900">{product.name}</h1>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-h2 font-bold text-n-900">{formatMoney(product.price, store.currency)}</span>
              {percent > 0 && (
                <>
                  <span className="text-body-lg text-n-500 line-through">{formatMoney(product.comparePrice!, store.currency)}</span>
                  <span className="text-sm font-bold text-[#B91C1C]">وفّر {formatMoney(product.comparePrice! - product.price, store.currency)}</span>
                </>
              )}
            </div>
            <StockNote trackStock={product.trackStock} stock={product.stock} inStock={product.inStock} />
          </div>

          <AddToCart product={product} />

          {store.deliveryZones.length > 0 && (
            <div className="flex items-start gap-2 rounded-md bg-n-0 p-3 text-sm text-n-700 ring-1 ring-n-200">
              <Truck className="mt-0.5 size-5 shrink-0 text-store" aria-hidden />
              <span>
                التوصيل من {formatMoney(Math.min(...store.deliveryZones.map((z) => z.fee)), store.currency)} · الدفع عند الاستلام
              </span>
            </div>
          )}

          {product.description && (
            <section aria-labelledby="desc-heading">
              <h2 id="desc-heading" className="mb-2 font-bold text-n-900">
                الوصف
              </h2>
              <p className="whitespace-pre-line text-n-700">{product.description}</p>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
