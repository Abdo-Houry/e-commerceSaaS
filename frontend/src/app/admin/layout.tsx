'use client';

import { CreditCard, Inbox, LayoutDashboard, LogOut, Settings, ShieldCheck, Store } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Providers } from '@/components/providers';
import { Spinner } from '@/components/ui/misc';
import { useAdminOverview } from '@/lib/admin-queries';
import { useAuthActions, useAuthGuard, useMe } from '@/lib/auth';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/admin', label: 'نظرة عامة', icon: LayoutDashboard, exact: true },
  { href: '/admin/requests', label: 'الطلبات', icon: Inbox },
  { href: '/admin/stores', label: 'المتاجر', icon: Store },
  { href: '/admin/payments', label: 'المدفوعات', icon: CreditCard },
  { href: '/admin/settings', label: 'الإعدادات', icon: Settings },
];

function PendingBadge({ className }: { className?: string }) {
  const pending = useAdminOverview().data?.pendingRequests ?? 0;
  if (!pending) return null;
  return <span className={cn('rounded-full bg-accent-500 px-2 text-caption font-bold text-n-900', className)}>{pending}</span>;
}

function AdminShell({ children }: { children: React.ReactNode }) {
  const allowed = useAuthGuard('admin');
  const pathname = usePathname();
  const router = useRouter();
  const { data: me } = useMe();
  const { logout } = useAuthActions();

  if (!allowed) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  const active = (href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href));

  return (
    <div className="min-h-dvh bg-n-50">
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-60 flex-col bg-n-900 text-n-0 lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-n-800 px-4">
          <ShieldCheck className="size-6 text-brand-400" aria-hidden />
          <span className="font-bold">إدارة متجري</span>
        </div>
        <nav className="flex-1 p-3" aria-label="قائمة الإدارة">
          <ul className="flex flex-col gap-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active(item.href, item.exact) ? 'page' : undefined}
                  className={cn(
                    'flex min-h-11 items-center gap-3 rounded-md px-3 font-semibold',
                    active(item.href, item.exact) ? 'bg-n-0/10 text-n-0' : 'text-n-300 hover:bg-n-0/5 hover:text-n-0',
                  )}
                >
                  <item.icon className="size-5" aria-hidden />
                  {item.label}
                  {item.href === '/admin/requests' && <PendingBadge className="ms-auto" />}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex flex-col gap-1 border-t border-n-800 p-3">
          {me?.store && (
            <Link href="/dashboard" className="flex min-h-11 items-center gap-3 rounded-md px-3 font-semibold text-n-300 hover:bg-n-0/5 hover:text-n-0">
              <Store className="size-5" aria-hidden />
              لوحة متجري
            </Link>
          )}
          <button
            type="button"
            onClick={async () => {
              await logout();
              router.replace('/login');
            }}
            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 font-semibold text-n-300 hover:bg-n-0/5 hover:text-n-0"
          >
            <LogOut className="size-5" aria-hidden />
            تسجيل الخروج
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-n-900 px-4 text-n-0 lg:hidden">
        <span className="flex items-center gap-2 font-bold">
          <ShieldCheck className="size-5 text-brand-400" aria-hidden />
          إدارة متجري
        </span>
        <button
          type="button"
          aria-label="تسجيل الخروج"
          onClick={async () => {
            await logout();
            router.replace('/login');
          }}
          className="flex size-11 cursor-pointer items-center justify-center rounded-md hover:bg-n-0/10"
        >
          <LogOut className="size-5" aria-hidden />
        </button>
      </header>

      <main className="px-4 pt-5 pb-28 lg:ms-60 lg:px-8 lg:pt-8 lg:pb-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-n-200 bg-n-0 pb-safe lg:hidden" aria-label="التنقل السفلي">
        <ul className="grid grid-cols-5">
          {NAV.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active(item.href, item.exact) ? 'page' : undefined}
                className={cn(
                  'relative flex min-h-16 flex-col items-center justify-center gap-0.5 text-caption font-semibold',
                  active(item.href, item.exact) ? 'text-brand-700' : 'text-n-600',
                )}
              >
                <item.icon className="size-6" aria-hidden />
                {item.label}
                {item.href === '/admin/requests' && <PendingBadge className="absolute top-1 start-[calc(50%+4px)]" />}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <AdminShell>{children}</AdminShell>
    </Providers>
  );
}
