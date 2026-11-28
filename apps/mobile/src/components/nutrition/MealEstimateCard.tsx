import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Text } from '../Text';
import { useTheme } from '../../context/ThemeContext';
import { useReduceMotion } from '../onboarding/use-reduce-motion';

export interface MealNumbers {
  description: string;
  calories: number;
  /** null = not known (e.g. quick add without macros); never saved as 0. */
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
}

const PORTION_LABEL: Record<number, string> = { 0.5: '½×', 1: '1×', 1.5: '1½×', 2: '2×' };

const PORTIONS = [0.5, 1, 1.5, 2] as const;

function MacroPill({ label, grams, color }: { label: string; grams: number | null; color: string }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.pill, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text variant="caption" style={{ color: theme.colors.textSecondary }}>
        {label}
      </Text>
      <Text variant="label" style={{ color: theme.colors.text, fontFamily: 'Inter_600SemiBold' }}>
        {grams === null ? '—' : `${Math.round(grams)} g`}
      </Text>
    </View>
  );
}

/**
 * An AI (or recent) meal ready to log: calories, macros, a portion picker that rescales
 * the numbers locally (no new AI call), and how the day looks after logging it.
 */
export function MealEstimateCard({
  meal,
  note,
  kcalLeftToday,
  children,
  onPortionChange,
}: {
  meal: MealNumbers;
  /** Short AI note about the meal, if any. */
  note?: string | null;
  /** Calories left today before this meal; null when there is no plan. */
  kcalLeftToday: number | null;
  /** Action buttons rendered under the card. */
  children?: ReactNode;
  /** Reports the scaled numbers whenever the portion changes. */
  onPortionChange?: (scaled: MealNumbers) => void;
}) {
  const { theme } = useTheme();
  const C = theme.colors;
  const reduceMotion = useReduceMotion();
  const [portion, setPortion] = useState<number>(1);
  const pop = useRef(new Animated.Value(reduceMotion ? 1 : 0.9)).current;

  const scale = (n: number | null) => (n === null ? null : n * portion);
  const scaled: MealNumbers = {
    // Name the portion so the log (and "Eat it again") doesn't pass a double plate off as one.
    description: portion === 1 ? meal.description : `${meal.description} (${PORTION_LABEL[portion]} portion)`,
    calories: Math.round(meal.calories * portion),
    proteinG: scale(meal.proteinG),
    carbsG: scale(meal.carbsG),
    fatG: scale(meal.fatG),
  };

  useEffect(() => {
    if (reduceMotion) return;
    Animated.spring(pop, { toValue: 1, friction: 6, tension: 120, useNativeDriver: true }).start();
  }, [pop, reduceMotion]);

  useEffect(() => {
    onPortionChange?.(scaled);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portion, meal]);

  const after = kcalLeftToday === null ? null : kcalLeftToday - scaled.calories;

  return (
    <Animated.View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border, transform: [{ scale: pop }] }]}>
      <Text variant="bodyMed" style={{ color: C.text }} numberOfLines={3}>
        {meal.description}
      </Text>
      <View style={styles.kcalRow}>
        <Text variant="display" style={{ color: C.text, fontSize: 40, lineHeight: 44 }}>
          {scaled.calories.toLocaleString()}
        </Text>
        <Text variant="bodyMed" style={{ color: C.textSecondary, marginBottom: 6 }}>
          kcal
        </Text>
      </View>
      <View style={styles.pills}>
        <MacroPill label="Protein" grams={scaled.proteinG} color={theme.primary} />
        <MacroPill label="Carbs" grams={scaled.carbsG} color={theme.secondary} />
        <MacroPill label="Fat" grams={scaled.fatG} color={C.warning} />
      </View>

      <View style={styles.portionRow} accessibilityRole="radiogroup" accessibilityLabel="Portion size">
        <Text variant="caption" style={{ color: C.textSecondary }}>
          Portion
        </Text>
        {PORTIONS.map((p) => {
          const selected = p === portion;
          return (
            <Pressable
              key={p}
              onPress={() => {
                Haptics.selectionAsync();
                setPortion(p);
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${p} times`}
              style={[
                styles.portion,
                { borderColor: selected ? theme.primary : C.border, backgroundColor: selected ? theme.primaryMuted : 'transparent' },
              ]}
            >
              <Text variant="label" style={{ color: selected ? theme.accentText : C.textSecondary, fontFamily: 'Inter_600SemiBold' }}>
                {PORTION_LABEL[p]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {after !== null && (
        <Text variant="caption" style={{ color: after < 0 ? C.warning : C.textSecondary }}>
          {after < 0
            ? `This puts you ${Math.abs(after).toLocaleString()} kcal over today.`
            : `After this you'll have ${after.toLocaleString()} kcal left today.`}
        </Text>
      )}
      {note ? (
        <Text variant="caption" style={{ color: C.textMuted }}>
          {note}
        </Text>
      ) : null}
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 10 },
  kcalRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  pills: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  portionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  portion: { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
});
