import { Store } from 'lucide-react';
import Link from 'next/link';
import { Providers } from '@/components/providers';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <div className="flex min-h-dvh flex-col bg-gradient-to-b from-brand-50 to-n-50">
        <header className="mx-auto flex h-16 w-full max-w-md items-center px-4">
          <Link href="/" className="flex items-center gap-2 text-h3 font-bold text-brand-700">
            <span className="flex size-9 items-center justify-center rounded-md bg-brand-700 text-n-0">
              <Store className="size-5" aria-hidden />
            </span>
            متجري
          </Link>
        </header>
        <main className="mx-auto w-full max-w-md flex-1 px-4 pb-10">{children}</main>
      </div>
    </Providers>
  );
}
