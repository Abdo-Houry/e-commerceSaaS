import { In } from 'typeorm';
import {
  buildOrderMessage,
  canOperate,
  DEMO_STORE_SLUG,
  formatMoney,
  type createPublicOrderSchema,
  type CreatePublicOrderResult,
  type PublicProductDto,
  type PublicStoreDto,
} from '@matjari/shared';
import type { z } from 'zod';
import { AppDataSource } from '../config/data-source';
import { Category } from '../entities/Category';
import { DeliveryZone } from '../entities/DeliveryZone';
import { Order } from '../entities/Order';
import { OrderItem } from '../entities/OrderItem';
import { Product } from '../entities/Product';
import { Store } from '../entities/Store';
import { toCategoryDto, toDeliveryZoneDto, toPublicProductDto } from '../utils/dto';
import { HttpError } from '../utils/http-error';
import { accessFor, getSettings } from './platform.service';

type CreatePublicOrder = z.output<typeof createPublicOrderSchema>;

const NO_ZONE_NAME = 'غير محددة';

/** A store customers can see: open, not suspended, and within its trial, subscription or grace period. */
async function findActiveStore(slug: string): Promise<Store> {
  const store = await AppDataSource.getRepository(Store).findOne({ where: { slug, isActive: true }, relations: { subscription: true } });
  if (!store) throw HttpError.notFound('المتجر غير موجود');
  const { graceDays } = await getSettings();
  if (!canOperate(accessFor(store, store.subscription, graceDays).state)) {
    throw new HttpError(404, 'STORE_UNAVAILABLE', 'المتجر غير متاح حالياً');
  }
  return store;
}

export async function getPublicStore(slug: string): Promise<PublicStoreDto> {
  const store = await findActiveStore(slug);
  const [categories, zones, counts] = await Promise.all([
    AppDataSource.getRepository(Category).find({
      where: { storeId: store.id },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    }),
    AppDataSource.getRepository(DeliveryZone).find({
      where: { storeId: store.id },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    }),
    AppDataSource.getRepository(Product)
      .createQueryBuilder('p')
      .select('p.categoryId', 'categoryId')
      .addSelect('COUNT(*)', 'count')
      .where('p.storeId = :storeId AND p.isActive = true AND p.categoryId IS NOT NULL', { storeId: store.id })
      .groupBy('p.categoryId')
      .getRawMany<{ categoryId: string; count: string }>(),
  ]);
  const byId = new Map(counts.map((c) => [c.categoryId, Number(c.count)]));

  return {
    id: store.id,
    name: store.name,
    slug: store.slug,
    description: store.description,
    logoUrl: store.logoUrl,
    faviconUrl: store.faviconUrl,
    bannerUrl: store.bannerUrl,
    bannerTitle: store.bannerTitle,
    bannerSubtitle: store.bannerSubtitle,
    template: store.template,
    primaryColor: store.primaryColor,
    secondaryColor: store.secondaryColor,
    font: store.font,
    whatsappNumber: store.whatsappNumber,
    currency: store.currency,
    city: store.city,
    socialLinks: { instagram: '', facebook: '', tiktok: '', ...store.socialLinks },
    businessHours: { summary: '', ...store.businessHours },
    minOrderAmount: store.minOrderAmount,
    // Empty categories are hidden from customers.
    categories: categories.map((c) => toCategoryDto(c, byId.get(c.id) ?? 0)).filter((c) => (c.productCount ?? 0) > 0),
    deliveryZones: zones.map(toDeliveryZoneDto),
  };
}

export async function getPublicProducts(slug: string, categoryId?: string): Promise<PublicProductDto[]> {
  const store = await findActiveStore(slug);
  const products = await AppDataSource.getRepository(Product).find({
    where: { storeId: store.id, isActive: true, ...(categoryId ? { categoryId } : {}) },
    order: { sortOrder: 'ASC', createdAt: 'DESC' },
  });
  return products.map(toPublicProductDto);
}

export async function getPublicProduct(slug: string, id: string): Promise<PublicProductDto> {
  const store = await findActiveStore(slug);
  const product = await AppDataSource.getRepository(Product).findOne({
    where: { id, storeId: store.id, isActive: true },
  });
  if (!product) throw HttpError.notFound('المنتج غير موجود');
  return toPublicProductDto(product);
}

/** Validates the customer's option choices against the product's current option definitions. */
function resolveOptions(product: Product, selected: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  const defs = product.options ?? [];
  for (const def of defs) {
    const value = selected[def.name];
    if (!value || !def.values.includes(value)) {
      throw HttpError.unprocessable(`اختر ${def.name} لمنتج "${product.name}"`, 'INVALID_OPTIONS', {
        productId: product.id,
        option: def.name,
      });
    }
    result[def.name] = value;
  }
  for (const key of Object.keys(selected)) {
    if (!defs.some((d) => d.name === key)) {
      throw HttpError.unprocessable(`خيار غير معروف لمنتج "${product.name}"`, 'INVALID_OPTIONS', {
        productId: product.id,
        option: key,
      });
    }
  }
  return result;
}

/**
 * Creates an order from a customer's cart. Every price is re-read from the
 * database; nothing price-related from the client is trusted. The order
 * number is issued under a row lock on the store, in the same transaction
 * that inserts the order and its items.
 */
export async function createPublicOrder(input: CreatePublicOrder): Promise<CreatePublicOrderResult> {
  if (input.slug === DEMO_STORE_SLUG) {
    throw HttpError.unprocessable('هذا متجر تجريبي لعرض الإمكانيات — لا يمكن إرسال طلبات منه', 'DEMO_STORE');
  }
  const store = await findActiveStore(input.slug);

  return AppDataSource.transaction(async (m) => {
    const locked = await m.findOne(Store, { where: { id: store.id }, lock: { mode: 'pessimistic_write' } });
    if (!locked || !locked.isActive) throw HttpError.notFound('المتجر غير موجود');

    // 1. Products, re-fetched and priced server-side.
    const ids = [...new Set(input.items.map((i) => i.productId))];
    const products = await m.find(Product, { where: { id: In(ids), storeId: locked.id } });
    const byId = new Map(products.map((p) => [p.id, p]));

    const requested = new Map<string, number>();
    const lines = input.items.map((item) => {
      const product = byId.get(item.productId);
      if (!product || !product.isActive) {
        throw HttpError.unprocessable('أحد المنتجات لم يعد متوفراً', 'PRODUCT_UNAVAILABLE', {
          productId: item.productId,
        });
      }
      requested.set(product.id, (requested.get(product.id) ?? 0) + item.quantity);
      return {
        product,
        quantity: item.quantity,
        selectedOptions: resolveOptions(product, item.selectedOptions),
      };
    });

    for (const [productId, quantity] of requested) {
      const product = byId.get(productId)!;
      if (product.trackStock && product.stock < quantity) {
        throw HttpError.unprocessable(
          product.stock > 0
            ? `الكمية المتوفرة من "${product.name}" هي ${product.stock} فقط`
            : `"${product.name}" غير متوفر حالياً`,
          'OUT_OF_STOCK',
          { productId, available: Math.max(product.stock, 0) },
        );
      }
    }

    // 2. Delivery zone — fee and name frozen onto the order.
    const zoneCount = await m.count(DeliveryZone, { where: { storeId: locked.id } });
    let zone: DeliveryZone | null = null;
    if (input.zoneId) {
      zone = await m.findOne(DeliveryZone, { where: { id: input.zoneId, storeId: locked.id } });
      if (!zone) throw HttpError.unprocessable('منطقة التوصيل غير صالحة', 'INVALID_ZONE');
    } else if (zoneCount > 0) {
      throw HttpError.unprocessable('اختر منطقة التوصيل', 'ZONE_REQUIRED');
    }

    // 3. Totals, in integer minor units.
    const subtotal = lines.reduce((sum, l) => sum + l.product.price * l.quantity, 0);
    if (subtotal < locked.minOrderAmount) {
      throw HttpError.unprocessable(
        `الحد الأدنى للطلب ${formatMoney(locked.minOrderAmount, locked.currency)}`,
        'MIN_ORDER_AMOUNT',
        { minOrderAmount: locked.minOrderAmount },
      );
    }
    const deliveryFee = zone?.fee ?? 0;
    const total = subtotal + deliveryFee;

    // 4. Sequential order number, under the lock.
    const orderNumber = locked.orderCounter + 1;
    await m.update(Store, locked.id, { orderCounter: orderNumber });

    const order = m.create(Order, {
      storeId: locked.id,
      orderNumber,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      zoneId: zone?.id ?? null,
      zoneName: zone?.name ?? NO_ZONE_NAME,
      customerAddress: input.customerAddress,
      notes: input.notes,
      subtotal,
      deliveryFee,
      total,
      status: 'new',
      whatsappOpened: false,
      stockDeducted: false,
    });
    await m.save(order);

    const items = lines.map((l) =>
      m.create(OrderItem, {
        orderId: order.id,
        productId: l.product.id,
        productName: l.product.name,
        unitPrice: l.product.price,
        quantity: l.quantity,
        selectedOptions: l.selectedOptions,
      }),
    );
    await m.save(items);

    // 5. The server builds the WhatsApp message so its format never drifts.
    const { message, url } = buildOrderMessage(
      {
        storeName: locked.name,
        orderNumber,
        currency: locked.currency,
        items: items.map((i) => ({
          productName: i.productName,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          selectedOptions: i.selectedOptions,
        })),
        subtotal,
        deliveryFee,
        total,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        zoneName: order.zoneName,
        customerAddress: order.customerAddress,
        notes: order.notes,
      },
      locked.whatsappNumber,
    );

    return {
      id: order.id,
      orderNumber,
      total,
      currency: locked.currency,
      whatsappNumber: locked.whatsappNumber,
      message,
      whatsappUrl: url,
    };
  });
}

export async function markWhatsappOpened(orderId: string): Promise<{ whatsappOpened: true }> {
  const res = await AppDataSource.getRepository(Order).update({ id: orderId }, { whatsappOpened: true });
  if (!res.affected) throw HttpError.notFound('الطلب غير موجود');
  return { whatsappOpened: true };
}
