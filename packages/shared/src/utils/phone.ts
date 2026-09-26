import { DEFAULT_COUNTRY_CODE } from '../constants';

/**
 * Normalises a phone number to wa.me format: digits only, international,
 * no "+", no leading zeros. "0944 123 456" → "963944123456".
 */
export function normalizePhone(raw: string, defaultCountry: string = DEFAULT_COUNTRY_CODE): string {
  let digits = (raw ?? '').replace(/\D/g, '');
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0')) {
    digits = defaultCountry + digits.replace(/^0+/, '');
  }
  return digits;
}

/** A normalised international number: 8–15 digits, not starting with 0. */
export function isValidPhone(normalized: string): boolean {
  return /^[1-9]\d{7,14}$/.test(normalized);
}
