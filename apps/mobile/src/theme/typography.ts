import type { TextStyle } from 'react-native';

// Two-font system: Plus Jakarta Sans for headings, Inter for body/UI/labels/numbers.
// Mirrors the equivalent scale in apps/web (tailwind.config.ts fontSize) and the
// weight mapping in constants/theme.ts's `FONT` (used by existing StyleSheet objects).
export const fonts = {
  headingBold: 'PlusJakartaSans_700Bold',
  headingExtra: 'PlusJakartaSans_800ExtraBold',
  bodyRegular: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemibold: 'Inter_600SemiBold',
} as const;

export const type: Record<string, TextStyle> = {
  display: { fontFamily: fonts.headingExtra, fontSize: 30, lineHeight: 34, letterSpacing: -0.6 },
  h1: { fontFamily: fonts.headingExtra, fontSize: 26, lineHeight: 31, letterSpacing: -0.5 },
  h2: { fontFamily: fonts.headingBold, fontSize: 21, lineHeight: 26, letterSpacing: -0.3 },
  h3: { fontFamily: fonts.headingBold, fontSize: 17, lineHeight: 22, letterSpacing: -0.2 },
  body: { fontFamily: fonts.bodyRegular, fontSize: 15, lineHeight: 24 },
  bodyMed: { fontFamily: fonts.bodyMedium, fontSize: 15, lineHeight: 24 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.bodyRegular, fontSize: 12, lineHeight: 16 },
  metric: { fontFamily: fonts.bodySemibold, fontSize: 24, lineHeight: 28, fontVariant: ['tabular-nums'] },
};
