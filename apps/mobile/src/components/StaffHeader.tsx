import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './Text';
import { useTheme } from '../context/ThemeContext';
import { COLORS, SPACING, FONT } from '../constants/theme';

interface StaffHeaderProps {
  /** Big page title. */
  title: string;
  /** Small accent line above the title (e.g. a greeting). Ignored when `onBack` is set. */
  greeting?: string;
  /** Muted line below the title (e.g. a count). Ignored when `onBack` is set. */
  subtitle?: string;
  /** Right-aligned node — a pill, button, or action. */
  right?: React.ReactNode;
  /** Renders a back chevron before the title instead of the greeting/subtitle block. */
  onBack?: () => void;
  /** Hairline divider under the header (used by list screens). */
  borderBottom?: boolean;
}

/**
 * One header for every staff screen. Uses real safe-area insets instead of a
 * hardcoded iOS gap, so notched Androids and every iPhone size sit correctly.
 * Neutrals come from the dark palette; the greeting accent follows the tenant theme.
 */
export function StaffHeader({
  title,
  greeting,
  subtitle,
  right,
  onBack,
  borderBottom,
}: StaffHeaderProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.wrap,
        { paddingTop: insets.top + SPACING.sm },
        borderBottom && styles.borderBottom,
      ]}
    >
      <View style={styles.left}>
        {onBack ? (
          <View style={styles.backRow}>
            <TouchableOpacity onPress={onBack} hitSlop={10} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={22} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.title}>{title}</Text>
          </View>
        ) : (
          <>
            {greeting ? (
              <Text style={[styles.greeting, { color: theme.primary }]}>{greeting}</Text>
            ) : null}
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </>
        )}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    gap: SPACING.md,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  left: { flex: 1, minWidth: 0 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  greeting: { fontSize: 13, ...FONT.medium, marginBottom: 4 },
  title: { fontSize: 26, color: COLORS.text, ...FONT.bold },
  subtitle: { fontSize: 13, color: COLORS.textMuted, ...FONT.regular, marginTop: 2 },
  right: { flexShrink: 0, marginTop: 2 },
});
