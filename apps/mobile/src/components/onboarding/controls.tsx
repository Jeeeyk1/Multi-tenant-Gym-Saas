import type { ComponentProps, ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Text } from '../Text';
import { useTheme } from '../../context/ThemeContext';

type IconName = ComponentProps<typeof Ionicons>['name'];

export interface Option<T extends string | number> {
  value: T;
  label: string;
  description?: string;
  icon?: IconName;
}

/** Single-choice list of tappable cards. */
export function OptionList<T extends string | number>({
  options,
  value,
  onChange,
  columns = 1,
}: {
  options: Option<T>[];
  value: T | null;
  onChange: (value: T) => void;
  columns?: 1 | 2;
}) {
  const { theme } = useTheme();
  return (
    <View style={[styles.optionList, columns === 2 && styles.optionGrid]} accessibilityRole="radiogroup">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            onPress={() => {
              Haptics.selectionAsync();
              onChange(option.value);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={option.description ? `${option.label}. ${option.description}` : option.label}
            style={[
              styles.option,
              columns === 2 && styles.optionHalf,
              {
                backgroundColor: selected ? theme.primaryMuted : theme.colors.surface,
                borderColor: selected ? theme.primary : theme.colors.border,
              },
            ]}
          >
            {option.icon && (
              <View style={[styles.optionIcon, { backgroundColor: selected ? theme.primary : theme.colors.background }]}>
                <Ionicons name={option.icon} size={18} color={selected ? theme.onPrimary : theme.colors.textSecondary} />
              </View>
            )}
            <View style={styles.optionText}>
              <Text variant="bodyMed" style={{ color: theme.colors.text }}>
                {option.label}
              </Text>
              {option.description && (
                <Text variant="caption" style={{ color: theme.colors.textSecondary }}>
                  {option.description}
                </Text>
              )}
            </View>
            {selected && <Ionicons name="checkmark-circle" size={20} color={theme.primary} />}
          </Pressable>
        );
      })}
    </View>
  );
}

/** Two-way switch, e.g. kg / lb. */
export function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const { theme } = useTheme();
  return (
    <View style={[styles.segment, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={[styles.segmentItem, selected && { backgroundColor: theme.primary }]}
          >
            <Text variant="label" style={{ color: selected ? theme.onPrimary : theme.colors.textSecondary }}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Labelled numeric input with a unit suffix. */
export function NumberField({
  label,
  value,
  onChange,
  suffix,
  decimal = false,
  error,
  accessibilityLabel,
}: {
  label: string;
  /** Spoken label when the visible one is blank or shared, e.g. "Height, inches". */
  accessibilityLabel?: string;
  value: string;
  onChange: (value: string) => void;
  suffix?: string;
  decimal?: boolean;
  error?: string | null;
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.field}>
      <Text variant="label" style={{ color: theme.colors.textSecondary }}>
        {label}
      </Text>
      <View
        style={[
          styles.inputWrap,
          { backgroundColor: theme.colors.surface, borderColor: error ? theme.colors.error : theme.colors.border },
        ]}
      >
        <TextInput
          value={value}
          onChangeText={(text) => onChange(decimal ? text.replace(/[^0-9.]/g, '') : text.replace(/[^0-9]/g, ''))}
          keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
          maxLength={6}
          style={[styles.input, { color: theme.colors.text }]}
          placeholderTextColor={theme.colors.textMuted}
          accessibilityLabel={accessibilityLabel ?? label}
        />
        {suffix && (
          <Text variant="bodyMed" style={{ color: theme.colors.textMuted }}>
            {suffix}
          </Text>
        )}
      </View>
      {error && (
        <Text variant="caption" style={{ color: theme.colors.error }}>
          {error}
        </Text>
      )}
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  loading = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const { theme } = useTheme();
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.primary,
        { backgroundColor: theme.primary, opacity: inactive ? 0.4 : pressed ? 0.85 : 1 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={theme.onPrimary} />
      ) : (
        <Text variant="bodyMed" style={{ color: theme.onPrimary, fontFamily: 'Inter_600SemiBold' }}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function TextButton({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={[styles.textButton, disabled && { opacity: 0.4 }]}
      hitSlop={8}
    >
      <Text variant="label" style={{ color: theme.colors.textSecondary }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Tinted notice box. */
export function Notice({ tone, children }: { tone: 'info' | 'warning' | 'error'; children: ReactNode }) {
  const { theme } = useTheme();
  const palette = {
    info: { bg: theme.primaryMuted, fg: theme.colors.text, icon: 'information-circle' as IconName, iconColor: theme.primary },
    warning: { bg: theme.colors.warningBg, fg: theme.colors.text, icon: 'alert-circle' as IconName, iconColor: theme.colors.warning },
    error: { bg: theme.colors.errorBg, fg: theme.colors.text, icon: 'close-circle' as IconName, iconColor: theme.colors.error },
  }[tone];
  return (
    <View style={[styles.notice, { backgroundColor: palette.bg }]} accessibilityRole="alert">
      <Ionicons name={palette.icon} size={18} color={palette.iconColor} />
      <Text variant="label" style={{ color: palette.fg, flex: 1 }}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  optionList: { gap: 10 },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  optionHalf: { width: '48.5%' },
  optionIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  optionText: { flex: 1, gap: 2 },
  segment: { flexDirection: 'row', alignSelf: 'flex-start', borderRadius: 10, borderWidth: 1, padding: 3 },
  segmentItem: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8 },
  field: { gap: 6, flex: 1 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  input: { flex: 1, paddingVertical: 12, fontSize: 18, fontFamily: 'Inter_600SemiBold' },
  primary: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  textButton: { alignSelf: 'center', paddingVertical: 10 },
  notice: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: 12, alignItems: 'flex-start' },
});
