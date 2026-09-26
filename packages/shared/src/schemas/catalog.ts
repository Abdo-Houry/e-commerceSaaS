import { z } from 'zod';
import { MAX_PRODUCT_IMAGES } from '../constants';
import { imageUrlSchema, moneySchema, optionalText, paginationSchema, queryBoolean, requiredText } from './common';

/* ─── Categories ─────────────────────────────────────────────────────── */

export const categoryInputSchema = z.object({
  name: requiredText(60, 'اسم التصنيف'),
  imageUrl: imageUrlSchema.nullish().transform((v) => v ?? null),
});
export type CategoryInput = z.input<typeof categoryInputSchema>;

export const categoryUpdateSchema = categoryInputSchema.partial();

export interface CategoryDto {
  id: string;
  name: string;
  imageUrl: string | null;
  sortOrder: number;
  productCount?: number;
}

/* ─── Products ───────────────────────────────────────────────────────── */

export const productOptionSchema = z.object({
  name: requiredText(40, 'اسم الخيار'),
  values: z
    .array(z.string().trim().min(1).max(40))
    .min(1, 'أضف قيمة واحدة على الأقل')
    .max(20, 'الحد الأقصى 20 قيمة')
    .refine((v) => new Set(v).size === v.length, 'القيم مكررة'),
});
export type ProductOption = z.infer<typeof productOptionSchema>;

const productFields = z.object({
  name: requiredText(120, 'اسم المنتج'),
  description: optionalText(2000),
  price: moneySchema,
  comparePrice: moneySchema.nullish().transform((v) => v ?? null),
  categoryId: z.uuid().nullish().transform((v) => v ?? null),
  images: z.array(imageUrlSchema).max(MAX_PRODUCT_IMAGES, `الحد الأقصى ${MAX_PRODUCT_IMAGES} صور`).default([]),
  stock: z.number().int('يجب أن يكون رقماً صحيحاً').min(0, 'لا يمكن أن يكون سالباً').max(1_000_000).default(0),
  trackStock: z.boolean().default(true),
  options: z
    .array(productOptionSchema)
    .max(5, 'الحد الأقصى 5 خيارات')
    .refine((o) => new Set(o.map((x) => x.name)).size === o.length, 'أسماء الخيارات مكررة')
    .default([]),
  isActive: z.boolean().default(true),
});

const comparePriceRule = (p: { price?: number; comparePrice?: number | null }) =>
  p.comparePrice == null || p.price == null || p.comparePrice > p.price;
const comparePriceIssue = { message: 'السعر قبل الخصم يجب أن يكون أكبر من السعر الحالي', path: ['comparePrice'] };

export const productInputSchema = productFields.refine(comparePriceRule, comparePriceIssue);
export type ProductInput = z.input<typeof productInputSchema>;

export const productUpdateSchema = productFields.partial().refine(comparePriceRule, comparePriceIssue);
export type ProductUpdateInput = z.input<typeof productUpdateSchema>;

export const productListQuerySchema = paginationSchema.extend({
  search: z.string().trim().max(100).optional(),
  categoryId: z.uuid().optional(),
  isActive: queryBoolean.optional(),
});
/** Client-side params; axios serialises booleans and numbers into the query string. */
export interface ProductListQuery {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  isActive?: boolean;
}

export interface ProductDto {
  id: string;
  categoryId: string | null;
  name: string;
  description: string | null;
  price: number;
  comparePrice: number | null;
  images: string[];
  stock: number;
  trackStock: boolean;
  options: ProductOption[];
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/* ─── Delivery zones ─────────────────────────────────────────────────── */

export const deliveryZoneInputSchema = z.object({
  name: requiredText(60, 'اسم المنطقة'),
  fee: moneySchema,
  estimatedTime: optionalText(60),
});
export type DeliveryZoneInput = z.input<typeof deliveryZoneInputSchema>;

export const deliveryZoneUpdateSchema = deliveryZoneInputSchema.partial();

export interface DeliveryZoneDto {
  id: string;
  name: string;
  fee: number;
  estimatedTime: string | null;
  sortOrder: number;
}
