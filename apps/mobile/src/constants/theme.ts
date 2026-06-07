export const COLORS = {
  // Core backgrounds
  background: '#0F0F0F',
  surface: '#1A1A1A',
  card: '#1A1A1A',
  border: '#2A2A2A',

  // Accents
  primary: '#6EE7B7',       // mint green
  primaryDark: '#4FD4A0',
  primaryLight: '#A7F3D0',
  secondary: '#3B82F6',     // electric blue
  secondaryDark: '#2563EB',
  alert: '#FF6B35',         // burn orange

  // Text
  text: '#FFFFFF',
  textSecondary: '#888888',
  textMuted: '#888888',
  onPrimary: '#000000',     // text/icons on mint or gradient backgrounds

  // Status
  success: '#22c55e',
  successBg: '#14532d',
  error: '#ef4444',
  errorBg: '#450a0a',
  warning: '#FF6B35',       // burn orange (replaces amber — streak, suspended)
  warningBg: '#2A1200',
  expired: '#ef4444',
  suspended: '#FF6B35',
  active: '#6EE7B7',
};

// Gradient presets — pass directly to LinearGradient colors prop
export const GRADIENTS = {
  primary: ['#6EE7B7', '#3B82F6'] as [string, string],
  accentCard: ['#0D2B22', '#0D1A2E'] as [string, string],
};

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
  regular: { fontFamily: 'Inter_400Regular', fontWeight: '400' as const },
  medium: { fontFamily: 'Inter_500Medium', fontWeight: '500' as const },
  semibold: { fontFamily: 'Inter_600SemiBold', fontWeight: '600' as const },
  bold: { fontFamily: 'Inter_700Bold', fontWeight: '700' as const },
};
