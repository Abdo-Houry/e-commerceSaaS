'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { getQueryClient } from '@/lib/query-client';

/** App providers for the merchant side (auth, onboarding, dashboard). The storefront doesn't load these. */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={getQueryClient()}>
      {children}
      <Toaster
        dir="rtl"
        position="top-center"
        richColors
        closeButton
        toastOptions={{ style: { fontFamily: 'var(--font-cairo)' } }}
      />
    </QueryClientProvider>
  );
}
