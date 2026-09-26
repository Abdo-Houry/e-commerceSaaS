import {
  canTransition,
  ORDER_STATUSES,
  type CategoryDto,
  type DeliveryZoneDto,
  type OrderDto,
  type OrderItemDto,
  type OrderSummaryDto,
  type ProductDto,
  type PublicProductDto,
  type StoreDto,
  type UserDto,
} from '@matjari/shared';
import type { Category } from '../entities/Category';
import type { DeliveryZone } from '../entities/DeliveryZone';
import type { Order } from '../entities/Order';
import type { OrderItem } from '../entities/OrderItem';
import type { Product } from '../entities/Product';
import type { Store } from '../entities/Store';
import type { Subscription } from '../entities/Subscription';
import type { User } from '../entities/User';

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

// Explicit response DTOs: nothing reaches the client unless it is listed here.

export function toUserDto(u: User): UserDto {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    emailVerifiedAt: iso(u.emailVerifiedAt),
    createdAt: u.createdAt.toISOString(),
  };
}

export function toStoreDto(s: Store, subscription?: Subscription | null): StoreDto {
  const sub = subscription ?? s.subscription ?? null;
  return {
    id: s.id,
    name: s.name,
    slug: s.slug,
    description: s.description,
    logoUrl: s.logoUrl,
    faviconUrl: s.faviconUrl,
    bannerUrl: s.bannerUrl,
    bannerTitle: s.bannerTitle,
    bannerSubtitle: s.bannerSubtitle,
    template: s.template,
    primaryColor: s.primaryColor,
    secondaryColor: s.secondaryColor,
    font: s.font,
    whatsappNumber: s.whatsappNumber,
    currency: s.currency,
    city: s.city,
    socialLinks: { instagram: '', facebook: '', tiktok: '', ...s.socialLinks },
    businessHours: { summary: '', ...s.businessHours },
    minOrderAmount: s.minOrderAmount,
    isActive: s.isActive,
    createdAt: s.createdAt.toISOString(),
    subscription: sub
      ? {
          plan: sub.plan,
          status: sub.status,
          trialEndsAt: iso(sub.trialEndsAt),
          currentPeriodEnd: iso(sub.currentPeriodEnd),
        }
      : null,
  };
}

export function toCategoryDto(c: Category, productCount?: number): CategoryDto {
  return {
    id: c.id,
    name: c.name,
    imageUrl: c.imageUrl,
    sortOrder: c.sortOrder,
    ...(productCount !== undefined ? { productCount } : {}),
  };
}

export function toProductDto(p: Product): ProductDto {
  return {
    id: p.id,
    categoryId: p.categoryId,
    name: p.name,
    description: p.description,
    price: p.price,
    comparePrice: p.comparePrice,
    images: p.images ?? [],
    stock: p.stock,
    trackStock: p.trackStock,
    options: p.options ?? [],
    isActive: p.isActive,
    sortOrder: p.sortOrder,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export function toPublicProductDto(p: Product): PublicProductDto {
  return {
    id: p.id,
    categoryId: p.categoryId,
    name: p.name,
    description: p.description,
    price: p.price,
    comparePrice: p.comparePrice,
    images: p.images ?? [],
    stock: p.trackStock ? p.stock : 0,
    trackStock: p.trackStock,
    options: p.options ?? [],
    inStock: !p.trackStock || p.stock > 0,
  };
}

export function toDeliveryZoneDto(z: DeliveryZone): DeliveryZoneDto {
  return { id: z.id, name: z.name, fee: z.fee, estimatedTime: z.estimatedTime, sortOrder: z.sortOrder };
}

export function toOrderSummaryDto(o: Order, itemCount: number): OrderSummaryDto {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    zoneName: o.zoneName,
    total: o.total,
    status: o.status,
    whatsappOpened: o.whatsappOpened,
    itemCount,
    createdAt: o.createdAt.toISOString(),
  };
}

export function toOrderItemDto(i: OrderItem): OrderItemDto {
  return {
    id: i.id,
    productId: i.productId,
    productName: i.productName,
    unitPrice: i.unitPrice,
    quantity: i.quantity,
    selectedOptions: i.selectedOptions ?? {},
    lineTotal: i.unitPrice * i.quantity,
  };
}

/** Renders an order purely from its own frozen columns — no join to Product. */
export function toOrderDto(o: Order, items: OrderItem[]): OrderDto {
  return {
    ...toOrderSummaryDto(o, items.reduce((n, i) => n + i.quantity, 0)),
    customerAddress: o.customerAddress,
    notes: o.notes,
    subtotal: o.subtotal,
    deliveryFee: o.deliveryFee,
    stockDeducted: o.stockDeducted,
    updatedAt: o.updatedAt.toISOString(),
    items: items.map(toOrderItemDto),
    allowedTransitions: ORDER_STATUSES.filter((s) => canTransition(o.status, s)),
  };
}
