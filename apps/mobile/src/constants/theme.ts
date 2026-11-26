// Accent used when a gym has no theme color.
export const DEFAULT_ACCENT = '#CCFF00';

export const DARK_COLORS = {
  // Core backgrounds
  background: '#0E1116',
  surface: '#171B22',
  card: '#171B22',
  border: '#23272F',

  // Accents (defaults — overridden by tenant theme at runtime)
  primary: DEFAULT_ACCENT,
  primaryDark: DEFAULT_ACCENT,
  primaryLight: DEFAULT_ACCENT,
  secondary: DEFAULT_ACCENT,
  secondaryDark: DEFAULT_ACCENT,
  alert: '#FB923C',

  // Text
  text: '#FFFFFF',
  textSecondary: '#C9CDD6',
  textMuted: '#93A4BA',
  onPrimary: '#0E1116',

  // Status
  success: '#4ADE80',
  successBg: '#0F2E22',
  error: '#F87171',
  errorBg: '#3A1414',
  warning: '#FB923C',
  warningBg: '#3A1D0E',
  expired: '#F87171',
  suspended: '#FB923C',
  active: '#4ADE80',
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

// Staff screens never use the gym's theme color.
export const STAFF_COLORS: ColorPalette = {
  background: '#071A2E',
  surface: '#0A2540',
  card: '#0A2540',
  border: '#1E3A5F',

  primary: '#93C5FD',
  primaryDark: '#1D4ED8',
  primaryLight: '#BFDBFE',
  secondary: '#3B82F6',
  secondaryDark: '#1E40AF',
  alert: '#FB923C',

  text: '#F5F7FA',
  textSecondary: '#CBD5E1',
  textMuted: '#93A4BA',
  onPrimary: '#0A2540',

  success: '#4ADE80',
  successBg: '#0F2E22',
  error: '#F87171',
  errorBg: '#3A1414',
  warning: '#FB923C',
  warningBg: '#3A1D0E',
  expired: '#F87171',
  suspended: '#FB923C',
  active: '#4ADE80',
};

export const STAFF_SURFACE_RAISED = '#12304F';

// Backwards-compat alias — existing code that imports COLORS keeps working in dark mode.
// Screens should migrate to `theme.colors` to get light/dark support.
export const COLORS = DARK_COLORS;

// Gradient presets — pass directly to LinearGradient colors prop
export const GRADIENTS = {
  primary: [DEFAULT_ACCENT, DEFAULT_ACCENT] as [string, string],
  accentCard: ['#171B22', '#0E1116'] as [string, string],
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
  md: 10,
  lg: 12,
  xl: 16,
  button: 14,
  control: 10,
  pill: 999,
  full: 9999,
};

export const SIZE = {
  buttonMember: 52,
  buttonStaff: 44,
  input: 44,
  navItem: 40,
  tile: 48,
  icon: { table: 16, nav: 20, standalone: 24 },
};

// Menus, dialogs and toasts only.
export const SHADOW_1 = {
  shadowColor: '#0A2540',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.12,
  shadowRadius: 24,
  elevation: 8,
};

// Two-font system: Manrope for headings and large numbers, Inter for everything else.
// Spread into styles as `...FONT.xxx`.
export const FONT = {
  regular: { fontFamily: 'Inter_400Regular', fontWeight: '400' as const },
  medium: { fontFamily: 'Inter_500Medium', fontWeight: '500' as const },
  semibold: { fontFamily: 'Inter_600SemiBold', fontWeight: '600' as const },
  bold: { fontFamily: 'Manrope_700Bold', fontWeight: '700' as const },
  display: { fontFamily: 'Manrope_800ExtraBold', fontWeight: '800' as const },
  wordmarkLight: { fontFamily: 'Manrope_500Medium', fontWeight: '500' as const },
};

/** Badge medal rims by tier; iron for untiered badges. Fixed across tenants and themes. */
export const BADGE_COLORS = {
  GOLD: '#D8A632',
  SILVER: '#AEB5BF',
  BRONZE: '#B8743F',
  IRON: '#3C4049',
  LOCKED: '#4A4D57',
  LOCKED_FACE: '#2B2D35',
  LOCKED_GLYPH: '#7C7F8A',
  GLYPH: '#FFFFFF',
  FALLBACK: '#6B7280',
  // Rarity effects: warm flames for legendary, a violet glow for epic.
  FLAME_CORE: '#FFB020',
  FLAME_EDGE: '#FF5A1F',
  EPIC_GLOW: '#A78BFA',
} as const;
