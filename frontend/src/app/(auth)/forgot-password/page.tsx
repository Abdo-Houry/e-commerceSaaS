'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@matjari/shared';
import { MailCheck } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { AuthCard, FormError } from '@/components/auth-card';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { api, getErrorMessage } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await api.post('/auth/forgot-password', values);
      setSentTo(values.email);
    } catch (err) {
      setFormError(getErrorMessage(err));
    }
  });

  return (
    <AuthCard
      title="نسيت كلمة المرور"
      description="أدخل بريدك وسنرسل لك رابطاً لتعيين كلمة مرور جديدة."
      footer={
        <Link href="/login" className="font-semibold text-brand-700 hover:underline">
          العودة لتسجيل الدخول
        </Link>
      }
    >
      {sentTo ? (
        <div className="flex flex-col items-center gap-3 text-center">
          <MailCheck className="size-12 text-brand-700" aria-hidden />
          <p className="text-n-700">
            إذا كان <span dir="ltr" className="font-semibold">{sentTo}</span> مسجلاً لدينا، فستصلك رسالة خلال دقائق. الرابط صالح لمدة ساعة.
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <FormError message={formError} />
          <Field label="البريد الإلكتروني" error={errors.email?.message}>
            <Input type="email" dir="ltr" autoComplete="email" inputMode="email" {...register('email')} />
          </Field>
          <Button type="submit" block size="lg" loading={isSubmitting}>
            إرسال الرابط
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
