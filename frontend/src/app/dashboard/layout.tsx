'use client';

import { DashboardShell } from '@/components/dashboard/shell';
import { Providers } from '@/components/providers';
import { Spinner } from '@/components/ui/misc';
import { useAuthGuard } from '@/lib/auth';

function Guarded({ children }: { children: React.ReactNode }) {
  const allowed = useAuthGuard('dashboard');
  if (!allowed) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }
  return <DashboardShell>{children}</DashboardShell>;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <Guarded>{children}</Guarded>
    </Providers>
  );
}
