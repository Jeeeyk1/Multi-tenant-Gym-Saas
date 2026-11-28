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

const MIN_TEXT_CONTRAST = 4.5;
const LIGHTNESS_STEP = 0.01;

function rgbToHsl([r, g, b]: [number, number, number]): [number, number, number] {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === rn ? (gn - bn) / d + (gn < bn ? 6 : 0) : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4;
  return [h / 6, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const hueToChannel = (t: number) => {
    const p2 = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p1 = 2 * l - p2;
    const tt = t < 0 ? t + 1 : t > 1 ? t - 1 : t;
    if (tt < 1 / 6) return p1 + (p2 - p1) * 6 * tt;
    if (tt < 1 / 2) return p2;
    if (tt < 2 / 3) return p1 + (p2 - p1) * (2 / 3 - tt) * 6;
    return p1;
  };
  return `#${[h + 1 / 3, h, h - 1 / 3]
    .map((t) => Math.round(hueToChannel(t) * 255).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;
}

/**
 * The gym colour adjusted to be readable as text (4.5:1) on every one of `backgrounds`.
 * Keeps the hue and only moves lightness: darker on light backgrounds, lighter on dark ones.
 * Returns `fallback` (usually the body text colour) if no lightness passes.
 */
export function readableAccent(accent: string, backgrounds: string[], fallback: string): string {
  const rgb = hexToRgb(accent);
  if (!rgb) return fallback;
  const passes = (color: string) => backgrounds.every((bg) => contrastRatio(color, bg) >= MIN_TEXT_CONTRAST);
  if (passes(accent)) return accent;

  const [h, s, startLightness] = rgbToHsl(rgb);
  const lightBackgrounds = backgrounds.every((bg) => relativeLuminance(bg) > 0.5);
  const step = lightBackgrounds ? -LIGHTNESS_STEP : LIGHTNESS_STEP;
  for (let l = startLightness + step; l >= 0 && l <= 1; l += step) {
    const candidate = hslToHex(h, s, l);
    if (passes(candidate)) return candidate;
  }
  return fallback;
}
