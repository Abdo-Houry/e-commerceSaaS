import { z } from 'zod';

export type ApiSuccess<T> = { data: T };
export type ApiError = { error: { code: string; message: string; details?: unknown } };

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export const healthSchema = z.object({
  status: z.literal('ok'),
  uptime: z.number(),
  db: z.enum(['up', 'down']),
  timestamp: z.string(),
});
export type Health = z.infer<typeof healthSchema>;

export const idParamSchema = z.object({ id: z.uuid() });

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const queryBoolean = z.enum(['true', 'false']).transform((v) => v === 'true');

export const reorderSchema = z.object({
  ids: z.array(z.uuid()).min(1, 'القائمة فارغة').max(500),
});
export type ReorderInput = z.infer<typeof reorderSchema>;

/** Images are always files uploaded through /api/uploads, stored as `/uploads/...` paths. */
export const imageUrlSchema = z
  .string()
  .max(500)
  .regex(/^\/uploads\/(users\/)?[\w-]+\/[\w-]+\.(jpg|png|webp)$/, 'رابط الصورة غير صالح');

/** Money in integer minor units. */
export const moneySchema = z
  .number({ error: 'أدخل رقماً صحيحاً' })
  .int('يجب أن يكون رقماً صحيحاً')
  .min(0, 'لا يمكن أن يكون سالباً')
  .max(Number.MAX_SAFE_INTEGER);

export const requiredText = (max: number, label = 'هذا الحقل') =>
  z
    .string({ error: `${label} مطلوب` })
    .trim()
    .min(1, `${label} مطلوب`)
    .max(max, `الحد الأقصى ${max} حرفاً`);

export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `الحد الأقصى ${max} حرفاً`)
    .nullish()
    .transform((v) => (v ? v : null));
