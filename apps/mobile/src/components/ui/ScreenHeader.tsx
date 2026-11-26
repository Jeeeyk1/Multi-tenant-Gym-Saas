import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { SPACING } from '../../constants/theme';
import { Text } from '../Text';
import { PressableScale } from './PressableScale';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  /** Shows a back chevron with a 44pt tap area. */
  onBack?: () => void;
  /** Right-aligned action, e.g. an icon button. */
  right?: React.ReactNode;
}

/**
 * Header for member screens, in the gym's theme. Uses safe-area insets instead of a fixed
 * top padding. Staff screens keep using StaffHeader (fixed staff colours).
 */
export function ScreenHeader({ title, subtitle, onBack, right }: ScreenHeaderProps) {
  const { theme } = useTheme();
  const C = theme.colors;
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + SPACING.sm }]}>
      {onBack ? (
        <PressableScale onPress={onBack} style={styles.back} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={26} color={C.text} />
        </PressableScale>
      ) : null}
      <View style={styles.titles}>
        <Text variant={onBack ? 'h2' : 'h1'} style={{ color: C.text }} accessibilityRole="header" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" style={{ color: C.textMuted }} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <View>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  // 44pt minimum tap target; pulled left so the chevron lines up with the content edge.
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -10 },
  titles: { flex: 1, minWidth: 0 },
});
