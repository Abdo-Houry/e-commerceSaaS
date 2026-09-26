export const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Darkens a merchant colour until white text on it reaches WCAG AA (4.5:1),
 * so any brand colour stays readable on buttons.
 */
export function ensureContrastWithWhite(hex: string, min = 4.5): string {
  if (!HEX_COLOR_RE.test(hex)) return hex;
  let rgb = hexToRgb(hex);
  let current = rgbToHex(rgb);
  for (let i = 0; i < 40 && contrastRatio(current, '#FFFFFF') < min; i++) {
    rgb = rgb.map((v) => v * 0.93) as [number, number, number];
    current = rgbToHex(rgb);
  }
  return current;
}

/** Picks near-black or white text for the best contrast on a background. */
export function readableTextColor(bg: string): '#1C1917' | '#FFFFFF' {
  if (!HEX_COLOR_RE.test(bg)) return '#FFFFFF';
  return contrastRatio(bg, '#FFFFFF') >= contrastRatio(bg, '#1C1917') ? '#FFFFFF' : '#1C1917';
}
