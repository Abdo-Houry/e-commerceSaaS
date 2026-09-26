import { formatMoney, type PublicProductDto } from '@matjari/shared';
import Link from 'next/link';
import { QuickAdd } from './cart-widgets';
import { ProductImage } from './product-image';
import { DiscountBadge, discountPercent, StockNote } from './stock-and-discount';

/**
 * One markup for all templates; layout switches through the tpl-* variants
 * driven by data-template on the store root (see globals.css).
 */
export function ProductCard({
  product,
  slug,
  currency,
  priority,
}: {
  product: PublicProductDto;
  slug: string;
  currency: string;
  priority?: boolean;
}) {
  const href = `/s/${slug}/product/${product.id}`;
  const discount = discountPercent(product.price, product.comparePrice);

  return (
    <article className="relative flex h-full flex-col overflow-hidden rounded-lg border border-n-200 bg-n-0 tpl-catalog:flex-row tpl-catalog:items-center tpl-catalog:gap-3 tpl-catalog:p-2 tpl-visual:rounded-xl tpl-visual:border-0 tpl-visual:shadow-sm">
      <Link prefetch={false} href={href} className="block shrink-0 tpl-catalog:w-24" tabIndex={-1} aria-hidden>
        <ProductImage
          src={product.images[0]}
          alt=""
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          priority={priority}
          className="aspect-square tpl-catalog:rounded-md tpl-visual:aspect-[4/5]"
        />
      </Link>

      <DiscountBadge percent={discount} className="absolute top-2 start-2 tpl-catalog:top-3 tpl-catalog:start-3 tpl-catalog:px-1.5" />

      <div className="flex flex-1 flex-col gap-1 p-3 tpl-catalog:p-0 tpl-visual:p-4">
        <h3 className="line-clamp-2 text-sm font-semibold text-n-900 tpl-visual:text-body-lg">
          <Link prefetch={false} href={href} className="after:absolute after:inset-0 tpl-catalog:after:hidden">
            {product.name}
          </Link>
        </h3>
        <div className="mt-auto flex items-end justify-between gap-1 pt-1">
          <div className="flex min-w-0 flex-col">
            <span className="text-sm font-bold whitespace-nowrap text-n-900 tpl-visual:text-body-lg">{formatMoney(product.price, currency)}</span>
            {discount > 0 && <span className="text-xs whitespace-nowrap text-n-600 line-through">{formatMoney(product.comparePrice!, currency)}</span>}
            <StockNote trackStock={product.trackStock} stock={product.stock} inStock={product.inStock} compact />
          </div>
          {product.inStock && (
            <div className="relative z-10">
              {product.options.length === 0 ? (
                <QuickAdd
                  product={{
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    image: product.images[0] ?? null,
                    maxQuantity: product.trackStock ? product.stock : null,
                  }}
                />
              ) : (
                <Link
                  href={href}
                  className="flex min-h-11 items-center rounded-full border border-store px-3 text-xs font-bold text-store-strong hover:bg-store-soft"
                  aria-label={`اختر خيارات ${product.name}`}
                >
                  اختر
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
