'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@matjari/shared';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { AuthCard, FormError } from '@/components/auth-card';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { applyServerErrors, getErrorMessage } from '@/lib/api';
import { useAuthActions } from '@/lib/auth';

function safeNext(next: string | null): string | null {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : null;
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { login } = useAuthActions();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const me = await login(values);
      const next = safeNext(params.get('next'));
      if (me.user.role === 'admin') router.replace(next?.startsWith('/admin') ? next : '/admin');
      else router.replace(me.store ? (next ?? '/dashboard') : '/onboarding');
    } catch (err) {
      if (!applyServerErrors(err, setError)) setFormError(getErrorMessage(err));
    }
  });

  return (
    <AuthCard
      title="تسجيل الدخول"
      description="أهلاً بعودتك! ادخل لإدارة متجرك."
      footer={
        <>
          ليس لديك حساب؟{' '}
          <Link href="/register" className="font-semibold text-brand-700 hover:underline">
            أنشئ حساباً مجانياً
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <FormError message={formError} />
        <Field label="البريد الإلكتروني" error={errors.email?.message}>
          <Input type="email" dir="ltr" autoComplete="email" inputMode="email" {...register('email')} />
        </Field>
        <Field label="كلمة المرور" error={errors.password?.message}>
          <Input type="password" dir="ltr" autoComplete="current-password" {...register('password')} />
        </Field>
        <Link href="/forgot-password" className="-mt-2 w-fit py-2 text-sm font-semibold text-brand-700 hover:underline">
          نسيت كلمة المرور؟
        </Link>
        <Button type="submit" block size="lg" loading={isSubmitting}>
          دخول
        </Button>
      </form>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
