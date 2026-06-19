export const COLORS = {
  // Core backgrounds
  background: '#09090F',
  surface: '#111119',
  card: '#111119',
  border: '#1F1F2E',

  // Accents
  primary: '#0D9488',       // teal
  primaryDark: '#0F766E',
  primaryLight: '#2DD4BF',
  secondary: '#0891B2',     // cyan (gradient partner)
  secondaryDark: '#0E7490',
  alert: '#F59E0B',         // amber

  // Text
  text: '#F8F8FF',
  textSecondary: '#6B6B80',
  textMuted: '#6B6B80',
  onPrimary: '#FFFFFF',     // text/icons on indigo backgrounds

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

// Gradient presets — pass directly to LinearGradient colors prop
export const GRADIENTS = {
  primary: ['#0D9488', '#0891B2'] as [string, string],  // teal → cyan
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
