import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Text } from '../Text';
import { useTheme } from '../../context/ThemeContext';
import { useAiUsage, useLogFood, useMealIdea } from '../../hooks/nutrition';
import { Notice, PrimaryButton, TextButton } from '../onboarding/controls';
import { formatApiError } from '../../lib/format-error';
import { AiThinking } from './AiThinking';
import { MealEstimateCard, type MealNumbers } from './MealEstimateCard';
import type { MealPlan, MealStyle } from '../../types';

// ai_usage_log feature key (apps/api AiFeature)
const FEATURE_MEAL_IDEA = 'meal_suggestion';

const STYLES: { value: MealStyle; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { value: 'QUICK', label: 'Quick', icon: 'timer-outline' },
  { value: 'BUDGET', label: 'Budget', icon: 'wallet-outline' },
  { value: 'HIGH_PROTEIN', label: 'High protein', icon: 'barbell-outline' },
  { value: 'LIGHT', label: 'Light', icon: 'leaf-outline' },
];

const THINKING_LINES = ['Checking what you have left today…', 'Picking something you can get nearby…', 'Balancing the protein…', 'Plating it up…'];

type Step = 'confirm' | 'thinking' | 'result';

/**
 * Meal idea in three steps: confirm (what it aims for, optional style, and the cost
 * in monthly uses), the coach thinking, then the dish with "I ate this".
 */
export function MealIdeaSheet({
  visible,
  remaining,
  onClose,
  onLogged,
}: {
  visible: boolean;
  /** What is left of today's plan. */
  remaining: { kcal: number; proteinG: number };
  onClose: () => void;
  onLogged: (message: string) => void;
}) {
  const { theme } = useTheme();
  const C = theme.colors;
  const mealIdea = useMealIdea();
  const logFood = useLogFood();
  const usageQ = useAiUsage();
  const ideasLeft = usageQ.data?.features.find((f) => f.feature === FEATURE_MEAL_IDEA)?.remaining;

  const [step, setStep] = useState<Step>('confirm');
  const [style, setStyle] = useState<MealStyle | undefined>(undefined);
  const [idea, setIdea] = useState<MealPlan | null>(null);
  const [toLog, setToLog] = useState<MealNumbers | null>(null);
  const [error, setError] = useState<string | null>(null);

  function close() {
    setStep('confirm');
    setIdea(null);
    setToLog(null);
    setError(null);
    onClose();
  }

  async function find() {
    setError(null);
    setStep('thinking');
    try {
      setIdea(await mealIdea.mutateAsync(style));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep('result');
    } catch (err) {
      setError(formatApiError(err, 'Could not come up with a meal.'));
      setStep(idea ? 'result' : 'confirm');
    }
  }

  async function ateIt(meal: MealNumbers) {
    setError(null);
    try {
      await logFood.mutateAsync({
        description: meal.description,
        calories: meal.calories,
        proteinG: meal.proteinG ?? undefined,
        carbsG: meal.carbsG ?? undefined,
        fatG: meal.fatG ?? undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const after = remaining.kcal - meal.calories;
      onLogged(after < 0 ? `Meal logged · ${Math.abs(after)} kcal over today` : `Meal logged · ${after} kcal left today`);
      close();
    } catch (err) {
      // Keep the idea on screen so retrying doesn't cost another suggestion.
      setError(formatApiError(err, 'Could not save this meal.'));
    }
  }

  const meal = idea?.meals[0];
  // Memoised: the estimate card reports scaled numbers back when `meal` changes, so a new
  // object on every render would loop.
  const mealNumbers = useMemo<MealNumbers | null>(
    () =>
      meal
        ? { description: meal.name, calories: meal.calories, proteinG: meal.proteinG, carbsG: meal.carbsG, fatG: meal.fatG }
        : null,
    [meal],
  );

  let body: React.ReactNode;
  if (step === 'thinking') {
    body = <AiThinking lines={THINKING_LINES} />;
  } else if (step === 'result' && meal && mealNumbers) {
    body = (
      <View style={styles.gap}>
        <MealEstimateCard meal={mealNumbers} kcalLeftToday={remaining.kcal} onPortionChange={setToLog}>
          <View style={styles.items}>
            {meal.items.map((item) => (
              <View key={item} style={styles.itemRow}>
                <Ionicons name="checkmark-circle" size={16} color={theme.accentText} />
                <Text variant="label" style={{ color: C.text, flex: 1 }}>
                  {item}
                </Text>
              </View>
            ))}
          </View>
          {error && <Notice tone="error">{error}</Notice>}
          <PrimaryButton label="I ate this" loading={logFood.isPending} onPress={() => ateIt(toLog ?? mealNumbers)} />
        </MealEstimateCard>
        <TextButton
          label={ideasLeft !== undefined ? `Another idea (${ideasLeft} left this month)` : 'Another idea'}
          onPress={find}
          disabled={ideasLeft === 0}
        />
      </View>
    );
  } else {
    body = (
      <View style={styles.gap}>
        <View style={[styles.aim, { backgroundColor: theme.primaryMuted }]}>
          <Ionicons name="restaurant-outline" size={20} color={theme.accentText} />
          <Text variant="label" style={{ color: C.text, flex: 1 }}>
            You have{' '}
            <Text variant="label" style={{ color: C.text, fontFamily: 'Inter_600SemiBold' }}>
              {Math.max(0, remaining.kcal).toLocaleString()} kcal
            </Text>{' '}
            and{' '}
            <Text variant="label" style={{ color: C.text, fontFamily: 'Inter_600SemiBold' }}>
              {Math.max(0, remaining.proteinG)} g protein
            </Text>{' '}
            left today. I&apos;ll suggest one meal that fits.
          </Text>
        </View>

        <Text variant="label" style={{ color: C.textSecondary }}>
          ANY PREFERENCE? (OPTIONAL)
        </Text>
        <View style={styles.styles} accessibilityRole="radiogroup">
          {STYLES.map((s) => {
            const selected = s.value === style;
            return (
              <Pressable
                key={s.value}
                onPress={() => {
                  Haptics.selectionAsync();
                  setStyle(selected ? undefined : s.value);
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={[
                  styles.style,
                  { borderColor: selected ? theme.primary : C.border, backgroundColor: selected ? theme.primaryMuted : C.surface },
                ]}
              >
                <Ionicons name={s.icon} size={16} color={selected ? theme.accentText : C.textSecondary} />
                <Text variant="label" style={{ color: selected ? theme.accentText : C.text }}>
                  {s.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {error && <Notice tone="error">{error}</Notice>}
        <PrimaryButton label="Find me a meal" onPress={find} disabled={ideasLeft === 0} />
        <Text variant="caption" style={{ color: C.textMuted, textAlign: 'center' }}>
          {ideasLeft === 0
            ? "You've used all your meal ideas this month."
            : ideasLeft !== undefined
              ? `Uses 1 of ${ideasLeft} meal ideas left this month`
              : 'Uses 1 meal idea from your monthly allowance'}
        </Text>
      </View>
    );
  }

  return (
    // Back can't dismiss while thinking: the request is already being charged, so show its result.
    <Modal visible={visible} transparent animationType="slide" onRequestClose={step === 'thinking' ? () => undefined : close}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={step === 'thinking' ? undefined : close} accessibilityLabel="Close" />
        <View style={[styles.sheet, { backgroundColor: C.background }]}>
          <View style={[styles.grabber, { backgroundColor: C.border }]} />
          <View style={styles.header}>
            <Text variant="h2" style={{ color: C.text, flex: 1 }}>
              {step === 'result' ? 'How about this?' : 'Meal idea'}
            </Text>
            {step !== 'thinking' && (
              <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Close" hitSlop={10}>
                <Ionicons name="close" size={22} color={C.textSecondary} />
              </Pressable>
            )}
          </View>
          <ScrollView contentContainerStyle={styles.content}>{body}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', paddingBottom: 28 },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, marginTop: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  content: { paddingHorizontal: 20, paddingBottom: 12 },
  gap: { gap: 12 },
  aim: { flexDirection: 'row', gap: 10, borderRadius: 14, padding: 14, alignItems: 'center' },
  styles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  style: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  items: { gap: 6 },
  itemRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
});
