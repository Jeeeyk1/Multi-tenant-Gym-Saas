import React from 'react';
import Svg, { Rect, Circle, G } from 'react-native-svg';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { COLORS, FONT } from '../constants/theme';

interface LogoProps {
  size?: number;
  showText?: boolean;
  gymName?: string;
}

export function Logo({ size = 72, showText = true, gymName }: LogoProps) {
  const { theme } = useTheme();
  const s = size;
  const light = theme.primary + '99';
  return (
    <View style={styles.container}>
      <Svg width={s} height={s} viewBox="0 0 80 80">
        {/* Background circle */}
        <Circle cx="40" cy="40" r="38" fill={theme.primary} opacity={0.15} />

        {/* Barbell — left outer plate */}
        <Rect x="4" y="24" width="12" height="32" rx="4" fill={theme.primary} />
        {/* Left inner collar */}
        <Rect x="16" y="30" width="7" height="20" rx="3" fill={light} />
        {/* Bar */}
        <Rect x="23" y="35" width="34" height="10" rx="3" fill={light} />
        {/* Right inner collar */}
        <Rect x="57" y="30" width="7" height="20" rx="3" fill={light} />
        {/* Right outer plate */}
        <Rect x="64" y="24" width="12" height="32" rx="4" fill={theme.primary} />

        {/* Grip knurling marks on bar */}
        <G opacity={0.4}>
          <Rect x="30" y="37" width="2" height="6" rx="1" fill={COLORS.background} />
          <Rect x="35" y="37" width="2" height="6" rx="1" fill={COLORS.background} />
          <Rect x="40" y="37" width="2" height="6" rx="1" fill={COLORS.background} />
          <Rect x="45" y="37" width="2" height="6" rx="1" fill={COLORS.background} />
          <Rect x="50" y="37" width="2" height="6" rx="1" fill={COLORS.background} />
        </G>
      </Svg>

      {showText && gymName ? (
        <Text style={[styles.appName, { fontSize: size * 0.36 }]}>
          {gymName}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 10,
  },
  appName: {
    color: COLORS.text,
    ...FONT.bold,
    letterSpacing: 1,
  },
});
