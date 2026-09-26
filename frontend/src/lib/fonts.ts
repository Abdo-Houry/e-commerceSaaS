import { Almarai, Tajawal } from 'next/font/google';

// Cairo is loaded globally in the root layout. The alternatives are declared here
// without preloading, so their files only download for stores that use them.
export const tajawal = Tajawal({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
  variable: '--font-tajawal',
  preload: false,
});

export const almarai = Almarai({
  subsets: ['arabic'],
  weight: ['400', '700'],
  display: 'swap',
  variable: '--font-almarai',
  preload: false,
});

