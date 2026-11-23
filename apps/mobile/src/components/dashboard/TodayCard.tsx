import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../Text';
import { useTheme } from '../../context/ThemeContext';
import type { DailyNutrition } from '../../types';
import { ProgressRing } from './ProgressRing';

function MacroBar({ label, eaten, target, color }: { label: string; eaten: number; target: number; color: string }) {
  const { theme } = useTheme();
  const pct = target > 0 ? Math.min(eaten / target, 1) : 0;
  return (
    <View style={styles.macro}>
      <View style={styles.macroHead}>
        <Text variant="caption" style={{ color: theme.colors.textSecondary }}>
          {label}
        </Text>
        <Text variant="caption" style={{ color: theme.colors.text, fontFamily: 'Inter_600SemiBold' }}>
          {eaten}/{target} g
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: theme.colors.border }]}>
        <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

/** Today's calories and macros against the plan. */
export function TodayCard({
  data,
  title = 'Today',
  onPress,
}: {
  data: DailyNutrition;
  /** e.g. "Yesterday" when showing another day. */
  title?: string;
  onPress?: () => void;
}) {
  const { theme } = useTheme();
  const C = theme.colors;
  const targets = data.targets!;
  const left = targets.kcal - data.eaten.kcal;
  const over = left < 0;

  const label = `${title}: ${data.eaten.kcal} of ${targets.kcal} calories eaten`;
  const body = (
    <>
      <View style={styles.header}>
        <Text variant="h3" style={{ color: C.text, flex: 1 }}>
          {title}
        </Text>
        {onPress && <Ionicons name="chevron-forward" size={18} color={C.textMuted} />}
      </View>
      <View style={styles.row}>
        <ProgressRing
          size={112}
          stroke={10}
          progress={targets.kcal > 0 ? data.eaten.kcal / targets.kcal : 0}
          color={theme.primary}
          overColor={C.warning}
          trackColor={C.border}
        >
          <Text variant="metric" style={{ color: C.text, fontSize: 22 }}>
            {Math.abs(left).toLocaleString()}
          </Text>
          <Text variant="caption" style={{ color: over ? C.warning : C.textSecondary }}>
            {over ? 'kcal over' : 'kcal left'}
          </Text>
        </ProgressRing>
        <View style={styles.macros}>
          <MacroBar label="Protein" eaten={data.eaten.proteinG} target={targets.proteinG} color={theme.primary} />
          <MacroBar label="Carbs" eaten={data.eaten.carbsG} target={targets.carbsG} color={theme.secondary} />
          <MacroBar label="Fat" eaten={data.eaten.fatG} target={targets.fatG} color={C.warning} />
        </View>
      </View>
    </>
  );

  // A plain View when not tappable, so screen readers don't announce it as disabled.
  if (!onPress) {
    return (
      <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]} accessible accessibilityLabel={label}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.card, { backgroundColor: C.surface, borderColor: C.border }, pressed && { opacity: 0.9 }]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 12, marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  macros: { flex: 1, gap: 10 },
  macro: { gap: 4 },
  macroHead: { flexDirection: 'row', justifyContent: 'space-between' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
});
