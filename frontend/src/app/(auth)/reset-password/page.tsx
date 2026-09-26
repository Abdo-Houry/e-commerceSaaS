'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { passwordSchema } from '@matjari/shared';
import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { AuthCard, FormError } from '@/components/auth-card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { api, getErrorMessage } from '@/lib/api';

const formSchema = z
  .object({ newPassword: passwordSchema, confirm: z.string() })
  .refine((v) => v.newPassword === v.confirm, { message: 'كلمتا المرور غير متطابقتين', path: ['confirm'] });
type FormValues = z.infer<typeof formSchema>;

function ResetForm() {
  const token = useSearchParams().get('token') ?? '';
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState<string | null>(token ? null : 'الرابط غير صالح. اطلب رابطاً جديداً.');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema) });

  const onSubmit = handleSubmit(async ({ newPassword }) => {
    setFormError(null);
    try {
      await api.post('/auth/reset-password', { token, newPassword });
      setDone(true);
    } catch (err) {
      setFormError(getErrorMessage(err));
    }
  });

  return (
    <AuthCard title="تعيين كلمة مرور جديدة">
      {done ? (
        <div className="flex flex-col items-center gap-3 text-center">
          <CheckCircle2 className="size-12 text-brand-700" aria-hidden />
          <p className="text-n-700">تم تغيير كلمة المرور بنجاح.</p>
          <Link href="/login" className={buttonVariants({ block: true })}>
            تسجيل الدخول
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <FormError message={formError} />
          <Field label="كلمة المرور الجديدة" error={errors.newPassword?.message} hint="8 أحرف على الأقل">
            <Input type="password" dir="ltr" autoComplete="new-password" {...register('newPassword')} />
          </Field>
          <Field label="تأكيد كلمة المرور" error={errors.confirm?.message}>
            <Input type="password" dir="ltr" autoComplete="new-password" {...register('confirm')} />
          </Field>
          <Button type="submit" block size="lg" loading={isSubmitting} disabled={!token}>
            حفظ كلمة المرور
          </Button>
          {!token && (
            <Link href="/forgot-password" className="text-center text-sm font-semibold text-brand-700 hover:underline">
              اطلب رابطاً جديداً
            </Link>
          )}
        </form>
      )}
    </AuthCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
