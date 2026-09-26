'use client';

import { useAuthGuard } from '@/lib/auth';
import { Card, Spinner } from './ui/misc';

export function AuthCard({
  title,
  description,
  children,
  footer,
  guest = true,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Redirect signed-in users away from this page. */
  guest?: boolean;
}) {
  const allowed = useAuthGuard('guest');
  if (guest && !allowed) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }
  return (
    <>
      <Card className="mt-4 p-6 shadow-sm">
        <h1 className="text-h2 font-bold text-n-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-n-600">{description}</p>}
        <div className="mt-6">{children}</div>
      </Card>
      {footer && <div className="mt-4 text-center text-sm text-n-700">{footer}</div>}
    </>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-md border border-status-cancelled-bg bg-[#FEF2F2] px-3 py-2 text-sm font-medium text-[#B91C1C]">
      {message}
    </p>
  );
}
