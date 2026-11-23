import { Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Text } from '../Text';
import { useTheme } from '../../context/ThemeContext';
import { GoalPace, PaceUnavailableReason } from '../../constants/enums';
import type { PaceOption } from '../../types';
import { formatGoalDate, formatWeeklyRate } from './format';

const PACE_COPY: Record<string, { title: string; note: string }> = {
  [GoalPace.STEADY]: { title: 'Steady', note: 'Easy to stick with' },
  [GoalPace.BALANCED]: { title: 'Balanced', note: 'Good progress, still flexible' },
  [GoalPace.FAST]: { title: 'Fast', note: 'Needs strict consistency' },
};

const UNAVAILABLE_COPY: Record<string, string> = {
  [PaceUnavailableReason.UNDER_18]: 'Not available under 18',
  [PaceUnavailableReason.HEALTH_CAUTION]: 'Not available with a health condition',
  [PaceUnavailableReason.SAFE_LIMIT_REACHED]: 'Not faster for you without going below a safe minimum',
};

/** One card per pace. FAST is marked red: it works, but only with strict consistency. */
export function PaceCards({
  options,
  selected,
  recommended,
  unit,
  onSelect,
}: {
  options: PaceOption[];
  selected: string | null;
  recommended: string | null;
  unit: 'kg' | 'lb';
  onSelect: (pace: string) => void;
}) {
  const { theme } = useTheme();

  return (
    <View style={styles.list} accessibilityRole="radiogroup">
      {options.map((option) => {
        const copy = PACE_COPY[option.pace];
        const isSelected = selected === option.pace;
        const isFast = option.pace === GoalPace.FAST;
        const accent = isFast ? theme.colors.error : theme.primary;

        return (
          <Pressable
            key={option.pace}
            disabled={!option.available}
            onPress={() => {
              Haptics.selectionAsync();
              onSelect(option.pace);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected, disabled: !option.available }}
            style={[
              styles.card,
              {
                backgroundColor: isSelected ? (isFast ? theme.colors.errorBg : theme.primaryMuted) : theme.colors.surface,
                borderColor: isSelected ? accent : theme.colors.border,
                opacity: option.available ? 1 : 0.45,
              },
            ]}
          >
            <View style={styles.header}>
              <View style={[styles.dot, { backgroundColor: isFast ? theme.colors.error : option.pace === GoalPace.STEADY ? theme.colors.success : theme.primary }]} />
              <Text variant="h3" style={{ color: theme.colors.text, flex: 1 }}>
                {copy.title}
              </Text>
              {recommended === option.pace && option.available && (
                <View style={[styles.tag, { backgroundColor: theme.primary }]}>
                  <Text variant="caption" style={{ color: theme.colors.onPrimary, fontFamily: 'Inter_600SemiBold' }}>
                    Recommended
                  </Text>
                </View>
              )}
            </View>

            {option.available ? (
              <>
                <Text variant="caption" style={{ color: isFast ? theme.colors.error : theme.colors.textSecondary }}>
                  {copy.note}
                </Text>
                <View style={styles.stats}>
                  <Stat label="Goal date" value={formatGoalDate(option.targetDate)} />
                  <Stat label="Per week" value={formatWeeklyRate(option.weeklyRateKg, unit)} />
                  <Stat label="Daily" value={`${option.targets.kcal.toLocaleString()} kcal`} />
                </View>
              </>
            ) : (
              <Text variant="caption" style={{ color: theme.colors.textSecondary }}>
                {option.unavailableReason ? UNAVAILABLE_COPY[option.unavailableReason] : 'Not available'}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();
  return (
    <View style={styles.stat}>
      <Text variant="caption" style={{ color: theme.colors.textMuted }}>
        {label}
      </Text>
      <Text variant="label" style={{ color: theme.colors.text, fontFamily: 'Inter_600SemiBold' }}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  card: { borderWidth: 1.5, borderRadius: 16, padding: 14, gap: 6 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  stats: { flexDirection: 'row', gap: 16, marginTop: 4 },
  stat: { gap: 2 },
});
