'use client';

import { canOperate, type AccessInfo } from '@matjari/shared';
import {
  AlertTriangle,
  CreditCard,
  ExternalLink,
  ShieldCheck,
  FolderTree,
  Home,
  LogOut,
  Menu,
  Package,
  Palette,
  Settings,
  ShoppingCart,
  Store,
  Truck,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useAuthActions, useMe } from '@/lib/auth';
import { useOverview } from '@/lib/queries';
import { assetUrl, cn } from '@/lib/utils';

const NAV = [
  { href: '/dashboard', label: 'الرئيسية', icon: Home, exact: true },
  { href: '/dashboard/orders', label: 'الطلبات', icon: ShoppingCart },
  { href: '/dashboard/products', label: 'المنتجات', icon: Package },
  { href: '/dashboard/categories', label: 'التصنيفات', icon: FolderTree },
  { href: '/dashboard/design', label: 'التصميم', icon: Palette },
  { href: '/dashboard/delivery', label: 'التوصيل', icon: Truck },
  { href: '/dashboard/settings', label: 'الإعدادات', icon: Settings },
  { href: '/dashboard/subscription', label: 'الاشتراك', icon: CreditCard },
];

// The four most frequent destinations sit in the phone's bottom bar; the rest go under "More".
const BOTTOM = ['/dashboard', '/dashboard/orders', '/dashboard/products', '/dashboard/design'];

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: me } = useMe();
  const { logout } = useAuthActions();
  const access = me?.access ?? null;
  const locked = access ? !canOperate(access.state) : false;
  const { data: overview } = useOverview(!locked);
  const nav = locked ? NAV.filter((n) => n.href === '/dashboard/subscription') : NAV;
  const bottom = locked ? ['/dashboard/subscription'] : BOTTOM;
  const [moreOpen, setMoreOpen] = useState(false);
  const store = me?.store;
  const newOrders = overview?.byStatus.new ?? 0;

  async function signOut() {
    await logout();
    router.replace('/login');
  }

  const storeLink = store ? `/s/${store.slug}` : '/';

  return (
    <div className="min-h-dvh bg-n-50">
      {/* Desktop sidebar (start edge = right in RTL) */}
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-64 flex-col border-e border-n-200 bg-n-0 lg:flex">
        <div className="flex h-16 items-center gap-3 border-b border-n-200 px-4">
          <StoreAvatar logoUrl={store?.logoUrl} />
          <div className="min-w-0">
            <p className="truncate font-bold text-n-900">{store?.name}</p>
            <p className="truncate text-caption text-n-600" dir="ltr">
              /s/{store?.slug}
            </p>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-3" aria-label="القائمة الرئيسية">
          <ul className="flex flex-col gap-1">
            {nav.map((item) => {
              const active = isActive(pathname, item.href, item.exact);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex min-h-11 items-center gap-3 rounded-md px-3 font-semibold transition-colors',
                      active ? 'bg-brand-50 text-brand-700' : 'text-n-700 hover:bg-n-100',
                    )}
                  >
                    <item.icon className="size-5" aria-hidden />
                    {item.label}
                    {item.href === '/dashboard/orders' && newOrders > 0 && (
                      <span className="ms-auto rounded-full bg-status-new-fg px-2 text-caption font-bold text-n-0">{newOrders}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="flex flex-col gap-1 border-t border-n-200 p-3">
          {me?.user.role === 'admin' && (
            <Link href="/admin" className="flex min-h-11 items-center gap-3 rounded-md px-3 font-semibold text-n-700 hover:bg-n-100">
              <ShieldCheck className="size-5" aria-hidden />
              لوحة المدير
            </Link>
          )}
          <a
            href={storeLink}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-11 items-center gap-3 rounded-md px-3 font-semibold text-n-700 hover:bg-n-100"
          >
            <ExternalLink className="size-5" aria-hidden />
            عرض المتجر
          </a>
          <button
            type="button"
            onClick={signOut}
            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 font-semibold text-n-700 hover:bg-n-100"
          >
            <LogOut className="size-5" aria-hidden />
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-n-200 bg-n-0/95 px-4 backdrop-blur lg:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <StoreAvatar logoUrl={store?.logoUrl} small />
          <span className="truncate font-bold">{store?.name}</span>
        </div>
        <a
          href={storeLink}
          target="_blank"
          rel="noreferrer"
          className="flex min-h-11 items-center gap-1.5 rounded-md px-2 text-sm font-semibold text-brand-700"
        >
          <ExternalLink className="size-4" aria-hidden />
          متجري
        </a>
      </header>

      <main className="px-4 pt-5 pb-28 lg:ms-64 lg:px-8 lg:pt-8 lg:pb-10">
        <div className="mx-auto max-w-6xl">
          <SubscriptionBanner access={access} pathname={pathname} />
          {children}
        </div>
      </main>

      {/* Mobile bottom navigation */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-n-200 bg-n-0 pb-safe lg:hidden"
        aria-label="التنقل السفلي"
      >
        <ul className="grid grid-cols-5">
          {nav.filter((n) => bottom.includes(n.href)).map((item) => {
            const active = isActive(pathname, item.href, item.exact);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative flex min-h-16 flex-col items-center justify-center gap-0.5 text-caption font-semibold',
                    active ? 'text-brand-700' : 'text-n-600',
                  )}
                >
                  <item.icon className="size-6" aria-hidden />
                  {item.label}
                  {item.href === '/dashboard/orders' && newOrders > 0 && (
                    <span className="absolute top-1.5 start-[calc(50%+6px)] min-w-5 rounded-full bg-status-new-fg px-1 text-center text-caption leading-5 text-n-0">
                      {newOrders}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className={cn(
                'flex min-h-16 w-full cursor-pointer flex-col items-center justify-center gap-0.5 text-caption font-semibold',
                nav.some((n) => !bottom.includes(n.href) && isActive(pathname, n.href)) ? 'text-brand-700' : 'text-n-600',
              )}
            >
              <Menu className="size-6" aria-hidden />
              المزيد
            </button>
          </li>
        </ul>
      </nav>

      <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
        <DialogContent title="المزيد" sheet>
          <ul className="flex flex-col gap-1">
            {nav.filter((n) => !bottom.includes(n.href)).map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className="flex min-h-12 items-center gap-3 rounded-md px-3 font-semibold text-n-800 hover:bg-n-100"
                >
                  <item.icon className="size-5 text-n-600" aria-hidden />
                  {item.label}
                </Link>
              </li>
            ))}
            <li className="my-1 border-t border-n-200" />
            {me?.user.role === 'admin' && (
              <li>
                <Link
                  href="/admin"
                  onClick={() => setMoreOpen(false)}
                  className="flex min-h-12 items-center gap-3 rounded-md px-3 font-semibold text-n-800 hover:bg-n-100"
                >
                  <ShieldCheck className="size-5 text-n-600" aria-hidden />
                  لوحة المدير
                </Link>
              </li>
            )}
            <li>
              <button
                type="button"
                onClick={signOut}
                className="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-md px-3 font-semibold text-[#B91C1C] hover:bg-status-cancelled-bg"
              >
                <LogOut className="size-5" aria-hidden />
                تسجيل الخروج
              </button>
            </li>
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StoreAvatar({ logoUrl, small }: { logoUrl?: string | null; small?: boolean }) {
  const src = assetUrl(logoUrl);
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-brand-700 text-n-0',
        small ? 'size-8' : 'size-10',
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        <Store className="size-5" aria-hidden />
      )}
    </span>
  );
}

function SubscriptionBanner({ access, pathname }: { access: AccessInfo | null; pathname: string }) {
  if (!access || pathname === '/dashboard/subscription') return null;
  const endingTrial = access.state === 'trial' && access.daysLeft <= 3;
  if (access.state !== 'grace' && !endingTrial) return null;
  return (
    <Link
      href="/dashboard/subscription"
      className="mb-4 flex items-start gap-3 rounded-md border border-accent-500/40 bg-accent-50 p-3 text-sm text-[#78350F] hover:bg-accent-100"
    >
      <AlertTriangle className="mt-0.5 size-5 shrink-0 text-accent-600" aria-hidden />
      <span>
        <span className="font-bold">
          {access.state === 'grace' ? 'انتهى اشتراكك' : 'تجربتك المجانية تنتهي قريباً'}
        </span>
        {' — '}
        سيتوقف متجرك خلال {access.daysLeft} {access.daysLeft === 1 ? 'يوم' : 'أيام'}. اضغط هنا لتجديد الاشتراك.
      </span>
    </Link>
  );
}
