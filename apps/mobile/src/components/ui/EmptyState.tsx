import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { SPACING } from '../../constants/theme';
import { Text } from '../Text';
import { Button } from './Button';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  /** e.g. "Log your first meal", or "Try again" for a failed load. */
  action?: { label: string; onPress: () => void };
  /** error tints the icon so a failed load doesn't look like "nothing here yet". */
  tone?: 'neutral' | 'error';
}

/** What a list shows when it has nothing, or when loading it failed. */
export function EmptyState({ icon, title, message, action, tone = 'neutral' }: EmptyStateProps) {
  const { theme } = useTheme();
  const C = theme.colors;
  const iconColor = tone === 'error' ? C.error : C.textMuted;
  const iconBg = tone === 'error' ? C.errorBg : C.surface;

  return (
    <View style={styles.wrap}>
      <View style={[styles.icon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={26} color={iconColor} />
      </View>
      <Text variant="h3" style={[styles.center, { color: C.text }]} accessibilityRole={tone === 'error' ? 'alert' : 'header'}>
        {title}
      </Text>
      {message ? (
        <Text variant="label" style={[styles.center, { color: C.textMuted }]}>
          {message}
        </Text>
      ) : null}
      {action ? (
        <Button label={action.label} onPress={action.onPress} variant="secondary" size="compact" style={styles.action} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: SPACING.xl, paddingHorizontal: SPACING.lg, gap: SPACING.sm },
  icon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.xs },
  center: { textAlign: 'center' },
  action: { marginTop: SPACING.sm, alignSelf: 'center' },
});
