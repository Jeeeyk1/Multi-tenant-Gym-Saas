import React from 'react';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';
import { RADIUS, SIZE, SPACING } from '../../constants/theme';
import { fonts } from '../../theme/typography';
import { haptic } from '../../lib/haptics';
import { Text } from '../Text';
import { PressableScale } from './PressableScale';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
/** idle → loading while the request runs → success for a moment after it lands. */
export type ButtonStatus = 'idle' | 'loading' | 'success';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  /** large = member screens (52pt), compact = staff screens and inline actions (44pt). */
  size?: 'large' | 'compact';
  status?: ButtonStatus;
  /** Label shown while status is success. Defaults to the normal label. */
  successLabel?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

/** The app's one button. Uses the gym's colour for primary; presses and success give haptics. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'large',
  status = 'idle',
  successLabel,
  icon,
  disabled,
  style,
  accessibilityHint,
}: ButtonProps) {
  const { theme } = useTheme();
  const C = theme.colors;
  const busy = status === 'loading';
  const inactive = disabled || busy || status === 'success';

  const palette = {
    primary: { bg: theme.primary, fg: theme.onPrimary, border: theme.primary },
    secondary: { bg: C.surface, fg: C.text, border: C.border },
    ghost: { bg: 'transparent', fg: C.text, border: 'transparent' },
    danger: { bg: C.errorBg, fg: C.error, border: C.errorBg },
  }[variant];

  return (
    <PressableScale
      onPress={() => {
        if (variant === 'primary') haptic.press();
        onPress();
      }}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled, busy }}
      style={[
        styles.base,
        {
          height: size === 'large' ? SIZE.buttonMember : SIZE.buttonStaff,
          backgroundColor: palette.bg,
          borderColor: palette.border,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <View style={styles.row}>
          {status === 'success' ? (
            <Animated.View entering={ZoomIn.springify().damping(14)}>
              <Ionicons name="checkmark" size={20} color={palette.fg} />
            </Animated.View>
          ) : icon ? (
            <Ionicons name={icon} size={18} color={palette.fg} />
          ) : null}
          <Text style={[styles.label, { color: palette.fg, fontSize: size === 'large' ? 16 : 14 }]}>
            {status === 'success' ? successLabel ?? label : label}
          </Text>
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: RADIUS.button,
    borderWidth: 1,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  label: { fontFamily: fonts.headingBold },
});
