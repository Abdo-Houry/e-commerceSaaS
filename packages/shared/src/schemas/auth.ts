import { z } from 'zod';
import type { UserRole } from '../constants';
import type { StoreDto } from './store';
import type { AccessInfo } from './subscription';

export const emailSchema = z
  .string({ error: 'البريد الإلكتروني مطلوب' })
  .trim()
  .toLowerCase()
  .min(1, 'البريد الإلكتروني مطلوب')
  .pipe(z.email('البريد الإلكتروني غير صالح').max(254));

export const passwordSchema = z
  .string({ error: 'كلمة المرور مطلوبة' })
  .min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل')
  .max(72, 'كلمة المرور طويلة جداً');

export const registerSchema = z.object({
  name: z.string({ error: 'الاسم مطلوب' }).trim().min(2, 'الاسم قصير جداً').max(80, 'الاسم طويل جداً'),
  email: emailSchema,
  password: passwordSchema,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string({ error: 'كلمة المرور مطلوبة' }).min(1, 'كلمة المرور مطلوبة').max(72),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({ email: emailSchema });
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'الرابط غير صالح').max(200),
  newPassword: passwordSchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export interface UserDto {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  emailVerifiedAt: string | null;
  createdAt: string;
}

export interface AuthResult {
  accessToken: string;
  user: UserDto;
}

export interface MeResult {
  user: UserDto;
  store: StoreDto | null;
  /** Subscription access for the store; null before onboarding. */
  access: AccessInfo | null;
}
