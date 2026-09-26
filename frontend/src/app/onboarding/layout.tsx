import type { Metadata } from 'next';
import { Providers } from '@/components/providers';

export const metadata: Metadata = { title: 'إعداد المتجر', robots: { index: false } };

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <Providers>{children}</Providers>;
}
