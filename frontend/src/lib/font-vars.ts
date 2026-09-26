import type { StoreFont } from '@matjari/shared';

/** CSS font-family values per store font (the variables come from next/font in lib/fonts.ts). */
export const storeFontVar: Record<StoreFont, string> = {
  cairo: 'var(--font-cairo)',
  tajawal: 'var(--font-tajawal)',
  almarai: 'var(--font-almarai)',
};
