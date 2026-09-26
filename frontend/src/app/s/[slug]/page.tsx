import type { PublicProductDto } from '@matjari/shared';
import { PackageOpen } from 'lucide-react';
import { notFound } from 'next/navigation';
import { ProductCard } from '@/components/storefront/product-card';
import { StoreHero } from '@/components/storefront/store-hero';
import { getProducts, getStore } from '@/lib/public-api';
import { assetUrl } from '@/lib/utils';

export const revalidate = 60;

// No paths are prebuilt; each storefront is rendered on first visit and then cached (ISR).
export function generateStaticParams() {
  return [];
}

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [store, products] = await Promise.all([getStore(slug), getProducts(slug)]);
  if (!store || !products) notFound();

  const sections: { id: string; name: string; products: PublicProductDto[] }[] = store.categories
    .map((c) => ({ id: c.id, name: c.name, products: products.filter((p) => p.categoryId === c.id) }))
    .filter((s) => s.products.length > 0);
  const known = new Set(sections.map((s) => s.id));
  const other = products.filter((p) => !p.categoryId || !known.has(p.categoryId));
  if (other.length) sections.push({ id: 'other', name: sections.length ? 'منتجات أخرى' : 'المنتجات', products: other });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: store.name,
    description: store.description ?? undefined,
    image: assetUrl(store.logoUrl) ?? undefined,
    address: store.city ? { '@type': 'PostalAddress', addressLocality: store.city } : undefined,
  };

  let rank = 0;

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />

      <StoreHero store={store} productCount={products.length} />

      <div id="products" className="mx-auto max-w-6xl scroll-mt-20 px-4">
        {sections.length > 1 && (
          <nav aria-label="التصنيفات" className="sticky top-16 z-20 -mx-4 mt-4 bg-n-50/95 px-4 py-2 backdrop-blur">
            <ul className="flex gap-2 overflow-x-auto scrollbar-none">
              {sections.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#c-${s.id}`}
                    className="flex min-h-11 items-center rounded-full border border-n-200 bg-n-0 px-4 text-sm font-semibold whitespace-nowrap text-n-800 hover:border-store hover:text-store-strong"
                  >
                    {s.name}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {products.length === 0 ? (
          <div className="mt-10 flex flex-col items-center gap-2 text-center text-n-600">
            <PackageOpen className="size-12 text-n-400" aria-hidden />
            <p className="font-semibold text-n-800">لا توجد منتجات بعد</p>
            <p className="text-sm">عُد قريباً، المتجر يجهّز منتجاته.</p>
          </div>
        ) : (
          sections.map((section) => (
            <section key={section.id} id={`c-${section.id}`} aria-labelledby={`h-${section.id}`} className="mt-6 scroll-mt-32">
              <h2 id={`h-${section.id}`} className="mb-3 text-h3 font-bold text-n-900">
                {section.name}
              </h2>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 tpl-catalog:grid-cols-1 tpl-catalog:gap-2 md:tpl-catalog:grid-cols-2 tpl-visual:grid-cols-1 tpl-visual:gap-5 sm:tpl-visual:grid-cols-2 lg:tpl-visual:grid-cols-3">
                {section.products.map((p) => (
                  <li key={p.id}>
                    <ProductCard product={p} slug={store.slug} currency={store.currency} priority={rank++ < 2 && !store.bannerUrl} />
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </main>
  );
}
