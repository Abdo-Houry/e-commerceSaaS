'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterInput } from '@matjari/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { AuthCard, FormError } from '@/components/auth-card';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { apiError, applyServerErrors, getErrorMessage } from '@/lib/api';
import { useAuthActions } from '@/lib/auth';

export default function RegisterPage() {
  const router = useRouter();
  const { register: signUp } = useAuthActions();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await signUp(values);
      router.replace('/onboarding');
    } catch (err) {
      if (apiError(err)?.code === 'EMAIL_TAKEN') {
        setError('email', { message: getErrorMessage(err) });
      } else if (!applyServerErrors(err, setError)) {
        setFormError(getErrorMessage(err));
      }
    }
  });

  return (
    <AuthCard
      title="أنشئ حسابك"
      description="14 يوماً تجربة مجانية. بدون بطاقة دفع."
      footer={
        <>
          لديك حساب؟{' '}
          <Link href="/login" className="font-semibold text-brand-700 hover:underline">
            سجّل الدخول
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <FormError message={formError} />
        <Field label="الاسم" error={errors.name?.message}>
          <Input autoComplete="name" {...register('name')} />
        </Field>
        <Field label="البريد الإلكتروني" error={errors.email?.message}>
          <Input type="email" dir="ltr" autoComplete="email" inputMode="email" {...register('email')} />
        </Field>
        <Field label="كلمة المرور" error={errors.password?.message} hint="8 أحرف على الأقل">
          <Input type="password" dir="ltr" autoComplete="new-password" {...register('password')} />
        </Field>
        <Button type="submit" block size="lg" loading={isSubmitting}>
          إنشاء الحساب
        </Button>
      </form>
    </AuthCard>
  );
}
