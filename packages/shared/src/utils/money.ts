/**
 * Money is always an integer amount of minor units. Currencies without a
 * practical minor unit (e.g. SYP) use 0 decimals, so 1 minor unit = 1 lira.
 */
export const CURRENCIES = {
  SYP: { label: 'ليرة سورية', symbol: 'ل.س', decimals: 0 },
  USD: { label: 'دولار أمريكي', symbol: '$', decimals: 2 },
  TRY: { label: 'ليرة تركية', symbol: 'TL', decimals: 2 },
  AED: { label: 'درهم إماراتي', symbol: 'د.إ', decimals: 2 },
  SAR: { label: 'ريال سعودي', symbol: 'ر.س', decimals: 2 },
  JOD: { label: 'دينار أردني', symbol: 'د.أ', decimals: 3 },
  LBP: { label: 'ليرة لبنانية', symbol: 'ل.ل', decimals: 0 },
  IQD: { label: 'دينار عراقي', symbol: 'د.ع', decimals: 0 },
  EGP: { label: 'جنيه مصري', symbol: 'ج.م', decimals: 2 },
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;
export const CURRENCY_CODES = Object.keys(CURRENCIES) as [CurrencyCode, ...CurrencyCode[]];

export function currencyInfo(currency: string) {
  return CURRENCIES[currency as CurrencyCode] ?? CURRENCIES.SYP;
}

/** Converts a major-unit amount typed by a user (e.g. 12.5) into integer minor units. */
export function toMinor(major: number, currency: string): number {
  const { decimals } = currencyInfo(currency);
  return Math.round(major * 10 ** decimals);
}

/** Converts integer minor units into a major-unit number, for form inputs only. */
export function toMajor(minor: number, currency: string): number {
  const { decimals } = currencyInfo(currency);
  return minor / 10 ** decimals;
}

/** Display-only formatting. Latin digits so numbers read the same everywhere, including WhatsApp. */
export function formatMoney(minor: number, currency: string): string {
  const { decimals, symbol } = currencyInfo(currency);
  const major = minor / 10 ** decimals;
  const formatted = major.toLocaleString('en-US', {
    minimumFractionDigits: Number.isInteger(major) ? 0 : decimals,
    maximumFractionDigits: decimals,
  });
  return `${formatted} ${symbol}`;
}
