import { ensureContrastWithWhite, readableTextColor, type StoreFont } from '@matjari/shared';
import { storeFontVar } from './font-vars';

/**
 * CSS variables for a merchant theme. Hex values from the database are never
 * turned into Tailwind classes (they wouldn't exist at build time); components
 * read these variables instead.
 */
export function themeVars(theme: { primaryColor: string; secondaryColor: string; font: StoreFont }): Record<string, string> {
  return {
    '--brand': theme.primaryColor,
    // A darker shade for surfaces carrying white text, so any merchant colour stays readable.
    '--brand-strong': ensureContrastWithWhite(theme.primaryColor),
    '--accent': theme.secondaryColor,
    '--accent-contrast': readableTextColor(theme.secondaryColor),
    '--store-font': storeFontVar[theme.font] ?? storeFontVar.cairo,
  };
}
