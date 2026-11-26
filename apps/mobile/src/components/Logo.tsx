import Svg, { Circle, Rect } from 'react-native-svg';
import { StyleSheet, Text as RNText, View } from 'react-native';
import { Text } from './Text';
import { useTheme } from '../context/ThemeContext';
import { BRAND, FONT } from '../constants/theme';

interface LogoProps {
  size?: number;
  /** The dot's color. Defaults to the gym's accent (Volt when the gym has none). */
  accent?: string;
  /** Tile color. White by default: the mark sits on dark surfaces (splash, login). Use Navy on light ones. */
  tile?: string;
  showText?: boolean;
  gymName?: string;
}

/** The FitOps mark: three tiles and a dot. */
export function Logo({ size = 72, accent, tile, showText = true, gymName }: LogoProps) {
  const { theme } = useTheme();
  const tileColor = tile ?? BRAND.white;
  const dotColor = accent ?? theme.primary;
  return (
    <View style={styles.container}>
      <Svg width={size} height={size} viewBox="0 0 48 48" accessibilityLabel="FitOps">
        <Rect x="3" y="3" width="19" height="19" rx="5" fill={tileColor} />
        <Circle cx="35.5" cy="12.5" r="9.5" fill={dotColor} />
        <Rect x="3" y="26" width="19" height="19" rx="5" fill={tileColor} />
        <Rect x="26" y="26" width="19" height="19" rx="5" fill={tileColor} />
      </Svg>

      {showText && gymName ? (
        <Text style={[styles.appName, { fontSize: size * 0.36, color: theme.colors.text }]}>{gymName}</Text>
      ) : null}
    </View>
  );
}

/** "Fit" in ExtraBold and "Ops" in Medium, per the FitOps brand. */
// Plain RN Text: the app's Text adds body size and line height, which would override the wordmark's.
export function Wordmark({ size = 28, color = BRAND.white }: { size?: number; color?: string }) {
  const shared = { fontSize: size, lineHeight: Math.round(size * 1.2), color, letterSpacing: -0.035 * size };
  return (
    <RNText accessibilityLabel="FitOps" style={[styles.wordmark, shared]}>
      <RNText style={[FONT.display, shared]}>Fit</RNText>
      <RNText style={[FONT.wordmarkLight, shared]}>Ops</RNText>
    </RNText>
  );
}

export function PoweredByFitOps() {
  const { theme } = useTheme();
  return (
    <View style={styles.powered} accessibilityLabel="Powered by FitOps">
      <Svg width={14} height={14} viewBox="0 0 48 48">
        <Rect x="3" y="3" width="19" height="19" rx="5" fill={theme.colors.textMuted} />
        <Circle cx="35.5" cy="12.5" r="9.5" fill={theme.colors.textMuted} />
        <Rect x="3" y="26" width="19" height="19" rx="5" fill={theme.colors.textMuted} />
        <Rect x="26" y="26" width="19" height="19" rx="5" fill={theme.colors.textMuted} />
      </Svg>
      <RNText style={[styles.poweredText, { color: theme.colors.textMuted }]}>Powered by FitOps</RNText>
    </View>
  );
}

const styles = StyleSheet.create({
  powered: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  poweredText: {
    ...FONT.medium,
    fontSize: 12,
    lineHeight: 16,
  },
  container: {
    alignItems: 'center',
    gap: 10,
  },
  appName: {
    ...FONT.bold,
    letterSpacing: 1,
  },
  wordmark: {
    textAlign: 'center',
  },
});
