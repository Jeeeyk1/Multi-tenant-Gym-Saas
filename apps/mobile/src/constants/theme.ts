export const DARK_COLORS = {
  // Core backgrounds
  background: '#09090F',
  surface: '#111119',
  card: '#111119',
  border: '#1F1F2E',

  // Accents (defaults — overridden by tenant theme at runtime)
  primary: '#0D9488',
  primaryDark: '#0F766E',
  primaryLight: '#2DD4BF',
  secondary: '#0891B2',
  secondaryDark: '#0E7490',
  alert: '#F59E0B',

  // Text
  text: '#F8F8FF',
  textSecondary: '#9B9BAA',
  textMuted: '#6B6B80',
  onPrimary: '#FFFFFF',

  // Status
  success: '#22c55e',
  successBg: '#0A2618',
  error: '#ef4444',
  errorBg: '#2A0808',
  warning: '#F59E0B',
  warningBg: '#1A1200',
  expired: '#ef4444',
  suspended: '#F59E0B',
  active: '#0D9488',
};

export const LIGHT_COLORS = {
  // Core backgrounds
  background: '#F2F2F7',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  border: '#E5E5EA',

  // Accents (defaults — overridden by tenant theme at runtime)
  primary: '#0D9488',
  primaryDark: '#0F766E',
  primaryLight: '#2DD4BF',
  secondary: '#0891B2',
  secondaryDark: '#0E7490',
  alert: '#F59E0B',

  // Text
  text: '#0A0A0F',
  textSecondary: '#6B6B80',
  textMuted: '#9B9BAA',
  onPrimary: '#FFFFFF',

  // Status
  success: '#16a34a',
  successBg: '#DCFCE7',
  error: '#dc2626',
  errorBg: '#FEE2E2',
  warning: '#d97706',
  warningBg: '#FEF9C3',
  expired: '#dc2626',
  suspended: '#d97706',
  active: '#16a34a',
};

export type ColorPalette = typeof DARK_COLORS;

// Backwards-compat alias — existing code that imports COLORS keeps working in dark mode.
// Screens should migrate to `theme.colors` to get light/dark support.
export const COLORS = DARK_COLORS;

// Gradient presets — pass directly to LinearGradient colors prop
export const GRADIENTS = {
  primary: ['#0D9488', '#0891B2'] as [string, string],
  accentCard: ['#042F2E', '#083344'] as [string, string],
};

export interface ThemePreset {
  id: string;
  name: string;
  primary: string;
  secondary: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  { id: 'teal',    name: 'Teal',    primary: '#0D9488', secondary: '#0891B2' },
  { id: 'ocean',   name: 'Ocean',   primary: '#38BDF8', secondary: '#6366F1' },
  { id: 'violet',  name: 'Violet',  primary: '#7C3AED', secondary: '#A78BFA' },
  { id: 'rose',    name: 'Rose',    primary: '#FB7185', secondary: '#E11D48' },
  { id: 'fire',    name: 'Fire',    primary: '#FB923C', secondary: '#EF4444' },
  { id: 'gold',    name: 'Gold',    primary: '#FBBF24', secondary: '#F97316' },
  { id: 'emerald', name: 'Emerald', primary: '#34D399', secondary: '#059669' },
  { id: 'mint',    name: 'Mint',    primary: '#6EE7B7', secondary: '#3B82F6' },
];

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  button: 10,
  xl: 24,
  full: 9999,
};

export const FONT = {
  regular: { fontFamily: 'PlusJakartaSans_400Regular', fontWeight: '400' as const },
  medium: { fontFamily: 'PlusJakartaSans_500Medium', fontWeight: '500' as const },
  semibold: { fontFamily: 'PlusJakartaSans_600SemiBold', fontWeight: '600' as const },
  bold: { fontFamily: 'PlusJakartaSans_700Bold', fontWeight: '700' as const },
  display: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontWeight: '800' as const },
};
