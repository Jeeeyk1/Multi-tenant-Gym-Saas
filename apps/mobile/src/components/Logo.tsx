import React from 'react';
import Svg, { Rect, Circle } from 'react-native-svg';
import { View, StyleSheet } from 'react-native';
import { Text } from './Text';
import { useTheme } from '../context/ThemeContext';
import { FONT } from '../constants/theme';

interface LogoProps {
  size?: number;
  showText?: boolean;
  gymName?: string;
}

const MARK_TILE = '#FFFFFF';
const MARK_DOT = '#3B82F6';

export function Logo({ size = 72, showText = true, gymName }: LogoProps) {
  const { theme } = useTheme();
  return (
    <View style={styles.container}>
      <Svg width={size} height={size} viewBox="0 0 48 48" accessibilityLabel="FitOps">
        <Rect x="3" y="3" width="19" height="19" rx="5" fill={MARK_TILE} />
        <Circle cx="35.5" cy="12.5" r="9.5" fill={MARK_DOT} />
        <Rect x="3" y="26" width="19" height="19" rx="5" fill={MARK_TILE} />
        <Rect x="26" y="26" width="19" height="19" rx="5" fill={MARK_TILE} />
      </Svg>

      {showText && gymName ? (
        <Text style={[styles.appName, { fontSize: size * 0.36, color: theme.colors.text }]}>
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
    ...FONT.bold,
    letterSpacing: 1,
  },
});
