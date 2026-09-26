import type { Metadata, Viewport } from 'next';
import { Cairo } from 'next/font/google';
import { SITE_URL } from '@/lib/env';
import './globals.css';

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-cairo',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'متجري — متجرك على واتساب', template: '%s | متجري' },
  description: 'أنشئ متجرك الإلكتروني خلال دقائق واستقبل الطلبات مباشرة على واتساب. بدون عمولات وبدون دفع إلكتروني.',
  applicationName: 'متجري',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#047857',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable}>
      <body>{children}</body>
    </html>
  );
}
