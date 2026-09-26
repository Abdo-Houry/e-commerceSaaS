import { z } from 'zod';
import { ORDER_STATUSES, type OrderStatus, type StoreFont, type StoreTemplate } from '../constants';
import { optionalText, paginationSchema, queryBoolean, requiredText } from './common';
import { phoneSchema, slugSchema, type BusinessHours, type SocialLinks } from './store';
import type { CategoryDto, DeliveryZoneDto, ProductDto } from './catalog';

/* ─── Public checkout ────────────────────────────────────────────────── */

export const orderItemInputSchema = z.object({
  productId: z.uuid('منتج غير صالح'),
  quantity: z.number().int().min(1, 'الكمية يجب أن تكون 1 على الأقل').max(99, 'الحد الأقصى 99'),
  selectedOptions: z.record(z.string().max(40), z.string().max(40)).default({}),
});
export type OrderItemInput = z.input<typeof orderItemInputSchema>;

export const createPublicOrderSchema = z.object({
  slug: slugSchema,
  items: z.array(orderItemInputSchema).min(1, 'السلة فارغة').max(50, 'عدد المنتجات كبير جداً'),
  customerName: requiredText(80, 'الاسم').refine((v) => v.length >= 2, 'الاسم قصير جداً'),
  customerPhone: phoneSchema,
  zoneId: z.uuid('اختر منطقة التوصيل').nullish().transform((v) => v ?? null),
  customerAddress: requiredText(300, 'العنوان').refine((v) => v.length >= 5, 'اكتب العنوان بتفصيل أكثر'),
  notes: optionalText(500),
});
export type CreatePublicOrderInput = z.input<typeof createPublicOrderSchema>;

/** Checkout form shape (the cart supplies `slug` and `items`). */
export const checkoutFormSchema = createPublicOrderSchema.pick({
  customerName: true,
  customerPhone: true,
  zoneId: true,
  customerAddress: true,
  notes: true,
});
export type CheckoutFormInput = z.input<typeof checkoutFormSchema>;

export interface CreatePublicOrderResult {
  id: string;
  orderNumber: number;
  total: number;
  currency: string;
  whatsappNumber: string;
  message: string;
  whatsappUrl: string;
}

export interface PublicStoreDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  bannerUrl: string | null;
  bannerTitle: string | null;
  bannerSubtitle: string | null;
  template: StoreTemplate;
  primaryColor: string;
  secondaryColor: string;
  font: StoreFont;
  whatsappNumber: string;
  currency: string;
  city: string | null;
  socialLinks: SocialLinks;
  businessHours: BusinessHours;
  minOrderAmount: number;
  categories: CategoryDto[];
  deliveryZones: DeliveryZoneDto[];
}

export type PublicProductDto = Omit<ProductDto, 'createdAt' | 'updatedAt' | 'isActive' | 'sortOrder'> & {
  inStock: boolean;
};

export const publicProductsQuerySchema = z.object({
  categoryId: z.uuid().optional(),
});

/* ─── Merchant order management ──────────────────────────────────────── */

export const orderStatusUpdateSchema = z.object({
  status: z.enum(ORDER_STATUSES, 'حالة غير صالحة'),
});
export type OrderStatusUpdateInput = z.infer<typeof orderStatusUpdateSchema>;

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'تاريخ غير صالح');

export const orderListQuerySchema = paginationSchema.extend({
  status: z.enum(ORDER_STATUSES).optional(),
  incomplete: queryBoolean.optional(),
  from: dateString.optional(),
  to: dateString.optional(),
  search: z.string().trim().max(100).optional(),
});
/** Client-side params; axios serialises booleans and numbers into the query string. */
export interface OrderListQuery {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  incomplete?: boolean;
  from?: string;
  to?: string;
  search?: string;
}

export const orderExportQuerySchema = orderListQuerySchema.omit({ page: true, limit: true });

export interface OrderItemDto {
  id: string;
  productId: string | null;
  productName: string;
  unitPrice: number;
  quantity: number;
  selectedOptions: Record<string, string>;
  lineTotal: number;
}

export interface OrderSummaryDto {
  id: string;
  orderNumber: number;
  customerName: string;
  customerPhone: string;
  zoneName: string;
  total: number;
  status: OrderStatus;
  whatsappOpened: boolean;
  itemCount: number;
  createdAt: string;
}

export interface OrderDto extends OrderSummaryDto {
  customerAddress: string;
  notes: string | null;
  subtotal: number;
  deliveryFee: number;
  stockDeducted: boolean;
  updatedAt: string;
  items: OrderItemDto[];
  allowedTransitions: OrderStatus[];
}

/* ─── Stats ──────────────────────────────────────────────────────────── */

export interface StatsOverview {
  todaySales: number;
  monthSales: number;
  monthOrders: number;
  incompleteOrders: number;
  lowStockCount: number;
  byStatus: Record<OrderStatus, number>;
  currency: string;
}

export interface TopProductDto {
  productId: string | null;
  productName: string;
  quantity: number;
  revenue: number;
}

export interface LowStockProductDto {
  id: string;
  name: string;
  stock: number;
  image: string | null;
}

export const topProductsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const lowStockQuerySchema = z.object({
  threshold: z.coerce.number().int().min(0).max(1000).default(5),
});
