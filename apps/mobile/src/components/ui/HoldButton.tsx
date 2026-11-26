import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useTheme } from '../../context/ThemeContext';
import { RADIUS } from '../../constants/theme';
import { fonts } from '../../theme/typography';
import { SPRING } from '../../theme/motion';
import { haptic } from '../../lib/haptics';

interface HoldButtonProps {
  label: string;
  onConfirm: () => void;
  /** neutral for ending things (check out), danger for destructive ones. */
  tone?: 'neutral' | 'danger';
  holdMs?: number;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Press and hold to confirm: a fill runs across the button and the action fires when it
 * reaches the end. Letting go early cancels. Screen-reader users confirm with a double-tap.
 */
export function HoldButton({ label, onConfirm, tone = 'neutral', holdMs = 900, loading = false, style }: HoldButtonProps) {
  const { theme } = useTheme();
  const C = theme.colors;
  const progress = useSharedValue(0);
  const scale = useSharedValue(1);

  const fire = () => {
    haptic.success();
    onConfirm();
  };

  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const fillColor = tone === 'danger' ? C.errorBg : C.border;
  const textColor = tone === 'danger' ? C.error : C.text;

  return (
    <Animated.View style={[pressStyle, style]}>
      <Pressable
        disabled={loading}
        onPressIn={() => {
          scale.value = withSpring(0.98, SPRING.snappy);
          progress.value = withTiming(1, { duration: holdMs, easing: Easing.linear }, (finished) => {
            if (finished) scheduleOnRN(fire);
          });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, SPRING.bouncy);
          progress.value = withTiming(0, { duration: 200 });
        }}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint="Press and hold to confirm"
        accessibilityState={{ busy: loading }}
        accessibilityActions={[{ name: 'activate' }]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'activate' && !loading) fire();
        }}
        style={[styles.button, { backgroundColor: C.surface, borderColor: C.border }]}
      >
        <Animated.View style={[styles.fill, { backgroundColor: fillColor }, fillStyle]} />
        {loading ? (
          <ActivityIndicator color={textColor} />
        ) : (
          <Animated.Text style={[styles.label, { color: textColor }]}>{label}</Animated.Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 48,
    borderRadius: RADIUS.button,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  label: { fontFamily: fonts.headingBold, fontSize: 14 },
});
