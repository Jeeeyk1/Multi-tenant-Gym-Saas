// Copy of apps/web/src/lib/accent.ts (the API can't import client code).
const DARK_TEXT = '#0E1116';
const LIGHT_TEXT = '#FFFFFF';

function hexToRgb(hex: string): [number, number, number] | null {
  let h = hex.trim().replace(/^#/, '');
  if (!/^([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(h)) return null;
  if (h.length <= 4) h = h.slice(0, 3).split('').map((c) => c + c).join('');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

function luminance(hex: string): number {
  const rgb = hexToRgb(hex) ?? [0, 0, 0];
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** '#RRGGBB' for any accepted hex form (so it is safe in CSS), or null if invalid. */
export function normalizeHex(hex: string | null | undefined): string | null {
  const rgb = hex ? hexToRgb(hex) : null;
  return rgb ? '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase() : null;
}

export function onAccent(accent: string): string {
  return contrast(accent, DARK_TEXT) >= contrast(accent, LIGHT_TEXT) ? DARK_TEXT : LIGHT_TEXT;
}
