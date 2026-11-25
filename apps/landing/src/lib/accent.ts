// Copied from apps/web/src/lib/accent.ts (no shared UI package yet). Keep the two in sync.

const DARK_TEXT = '#0E1116';
const LIGHT_TEXT = '#FFFFFF';

// Accepts #RGB, #RGBA, #RRGGBB and #RRGGBBAA, with or without '#'. Alpha is ignored.
function hexToRgb(hex: string): [number, number, number] | null {
  let h = hex.trim().replace(/^#/, '');
  if (!/^([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(h)) return null;
  if (h.length <= 4) h = h.slice(0, 3).split('').map((c) => c + c).join('');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a: string, b: string): number {
  const [l1, l2] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** Dark or white text, whichever reads better on `accent`. For gradients, pass the first color. */
export function onAccent(accent: string): string {
  return contrastRatio(accent, DARK_TEXT) >= contrastRatio(accent, LIGHT_TEXT) ? DARK_TEXT : LIGHT_TEXT;
}
