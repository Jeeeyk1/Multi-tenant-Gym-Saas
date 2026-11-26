import React, { useEffect } from 'react';
import type { DimensionValue, StyleProp, ViewStyle } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';
import { RADIUS } from '../../constants/theme';

interface SkeletonProps {
  width?: DimensionValue;
  height: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Placeholder block shown while content loads, shaped like the content it stands in for.
 * Prefer a few skeletons that match the layout over a centred spinner.
 */
export function Skeleton({ width = '100%', height, radius = RADIUS.lg, style }: SkeletonProps) {
  const { theme } = useTheme();
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(0.45, { duration: 800, reduceMotion: ReduceMotion.System }), -1, true);
  }, [pulse]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width, height, borderRadius: radius, backgroundColor: theme.colors.border }, animatedStyle, style]}
    />
  );
}
