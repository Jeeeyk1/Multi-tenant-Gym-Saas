import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Text } from '../../components/Text';
import { useTheme } from '../../context/ThemeContext';
import { useDailyNutrition } from '../../hooks/fitness-plan';
import { useAiUsage, useAnalyseMeal, useFoodLogs, useLogFood, useMealIdea } from '../../hooks/nutrition';
import { TodayCard } from '../../components/dashboard/TodayCard';
import { SetupPlanCard } from '../../components/dashboard/SetupPlanCard';
import { NumberField, Notice, PrimaryButton, SegmentedToggle, TextButton } from '../../components/onboarding/controls';
import { formatApiError } from '../../lib/format-error';
import { toNumber } from '../../lib/units';
import type { MealAnalysis, MealPlan } from '../../types';

// ai_usage_log feature keys (apps/api AiFeature)
const FEATURE_MEAL_TEXT = 'analyse_meal_text';
const FEATURE_MEAL_IDEA = 'meal_suggestion';

function shiftDate(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function dayLabel(date: string, today: string): string {
  if (date === today) return 'Today';
  if (date === shiftDate(today, -1)) return 'Yesterday';
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

type AddMode = 'ai' | 'manual';

export default function NutritionScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const C = theme.colors;

  // `undefined` = today in the gym's timezone; the API tells us which date that is.
  const [date, setDate] = useState<string | undefined>(undefined);
  const dailyQ = useDailyNutrition(date);
  const [todayDate, setTodayDate] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (date === undefined && dailyQ.data?.date) setTodayDate(dailyQ.data.date);
  }, [date, dailyQ.data?.date]);
  const shownDate = date ?? dailyQ.data?.date;
  const isToday = shownDate !== undefined && shownDate === todayDate;

  const logsQ = useFoodLogs(shownDate);
  const usageQ = useAiUsage();
  const remaining = (feature: string) => usageQ.data?.features.find((f) => f.feature === feature)?.remaining;

  const analyse = useAnalyseMeal();
  const mealIdea = useMealIdea();
  const logFood = useLogFood();

  const [mode, setMode] = useState<AddMode>('ai');
  const [description, setDescription] = useState('');
  const [estimate, setEstimate] = useState<MealAnalysis | null>(null);
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [idea, setIdea] = useState<MealPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setDescription('');
    setEstimate(null);
    setKcal('');
    setProtein('');
  }

  async function runEstimate() {
    setError(null);
    try {
      setEstimate(await analyse.mutateAsync(description.trim()));
    } catch (err) {
      setError(formatApiError(err, 'Could not estimate this meal.'));
    }
  }

  /** Returns false when saving failed (the error is shown). */
  async function save(data: Parameters<typeof logFood.mutateAsync>[0]): Promise<boolean> {
    setError(null);
    try {
      await logFood.mutateAsync(data);
      resetForm();
      return true;
    } catch (err) {
      setError(formatApiError(err, 'Could not save this meal.'));
      return false;
    }
  }

  async function suggest() {
    setError(null);
    try {
      setIdea(await mealIdea.mutateAsync());
    } catch (err) {
      setError(formatApiError(err, 'Could not get a meal idea.'));
    }
  }

  const mealTextLeft = remaining(FEATURE_MEAL_TEXT);
  const ideasLeft = remaining(FEATURE_MEAL_IDEA);
  const ideaMeal = idea?.meals[0];

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: C.background }]} edges={['top']}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={10}>
            <Ionicons name="chevron-back" size={24} color={C.text} />
          </Pressable>
          <Text variant="h2" style={{ color: C.text, flex: 1 }}>
            Nutrition
          </Text>
        </View>

        {shownDate && todayDate && (
          <View style={styles.dateRow}>
            <Pressable
              onPress={() => setDate(shiftDate(shownDate, -1))}
              accessibilityRole="button"
              accessibilityLabel="Previous day"
              hitSlop={10}
            >
              <Ionicons name="chevron-back-circle-outline" size={26} color={C.textSecondary} />
            </Pressable>
            <Text variant="bodyMed" style={{ color: C.text, minWidth: 120, textAlign: 'center' }}>
              {dayLabel(shownDate, todayDate)}
            </Text>
            <Pressable
              onPress={() => setDate(shiftDate(shownDate, 1) === todayDate ? undefined : shiftDate(shownDate, 1))}
              disabled={isToday}
              accessibilityRole="button"
              accessibilityLabel="Next day"
              hitSlop={10}
            >
              <Ionicons name="chevron-forward-circle-outline" size={26} color={isToday ? C.border : C.textSecondary} />
            </Pressable>
          </View>
        )}

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {dailyQ.isError && !dailyQ.data && (
            <View style={styles.gap}>
              <Notice tone="error">{formatApiError(dailyQ.error, 'Could not load this day.')}</Notice>
              <TextButton label="Try again" onPress={() => dailyQ.refetch()} />
            </View>
          )}

          {dailyQ.data?.targets ? (
            <TodayCard
              data={dailyQ.data}
              title={shownDate && todayDate ? dayLabel(shownDate, todayDate) : 'Today'}
            />
          ) : dailyQ.data ? (
            <SetupPlanCard
              title="Set up your plan"
              subtitle="Get daily calorie and protein targets to track against."
              onPress={() => router.push('/onboarding')}
            />
          ) : null}

          {error && <Notice tone="error">{error}</Notice>}

          {/* Add a meal (today only — the API logs meals at the current time) */}
          {isToday && (
            <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={styles.cardHead}>
                <Text variant="h3" style={{ color: C.text, flex: 1 }}>
                  Add a meal
                </Text>
                <SegmentedToggle
                  options={[
                    { value: 'ai', label: 'Describe' },
                    { value: 'manual', label: 'Numbers' },
                  ]}
                  value={mode}
                  onChange={(m) => {
                    setMode(m);
                    setEstimate(null);
                  }}
                />
              </View>

              <TextInput
                value={description}
                onChangeText={(t) => {
                  setDescription(t);
                  setEstimate(null);
                }}
                placeholder="e.g. 1 cup rice, 2 pcs chicken adobo"
                placeholderTextColor={C.textMuted}
                maxLength={300}
                multiline
                style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.background }]}
                accessibilityLabel="What did you eat?"
              />

              {mode === 'manual' ? (
                <>
                  <View style={styles.row}>
                    <NumberField label="Calories" value={kcal} onChange={setKcal} suffix="kcal" />
                    <NumberField label="Protein" value={protein} onChange={setProtein} suffix="g" decimal />
                  </View>
                  <PrimaryButton
                    label="Save meal"
                    disabled={!description.trim() || toNumber(kcal) === null}
                    loading={logFood.isPending}
                    onPress={() =>
                      save({
                        description: description.trim(),
                        calories: toNumber(kcal) ?? undefined,
                        proteinG: toNumber(protein) ?? undefined,
                      })
                    }
                  />
                </>
              ) : estimate ? (
                <View style={styles.gap}>
                  <View style={[styles.estimate, { backgroundColor: theme.primaryMuted }]}>
                    <Text variant="bodyMed" style={{ color: C.text }}>
                      {estimate.calories} kcal · P {Math.round(estimate.proteinG)} g · C {Math.round(estimate.carbsG)} g · F{' '}
                      {Math.round(estimate.fatG)} g
                    </Text>
                    {estimate.notes ? (
                      <Text variant="caption" style={{ color: C.textSecondary }}>
                        {estimate.notes}
                      </Text>
                    ) : null}
                  </View>
                  <PrimaryButton
                    label="Save meal"
                    loading={logFood.isPending}
                    onPress={() =>
                      save({
                        description: description.trim() || estimate.description,
                        calories: estimate.calories,
                        proteinG: estimate.proteinG,
                        carbsG: estimate.carbsG,
                        fatG: estimate.fatG,
                      })
                    }
                  />
                  <TextButton label="Discard" onPress={() => setEstimate(null)} />
                </View>
              ) : (
                <>
                  <PrimaryButton
                    label="Estimate with AI"
                    disabled={!description.trim() || mealTextLeft === 0}
                    loading={analyse.isPending}
                    onPress={runEstimate}
                  />
                  {mealTextLeft !== undefined && (
                    <Text variant="caption" style={{ color: C.textMuted, textAlign: 'center' }}>
                      {mealTextLeft} AI estimates left this month
                    </Text>
                  )}
                </>
              )}
            </View>
          )}

          {/* Meal idea that fits what is left today */}
          {isToday && dailyQ.data?.targets && (
            <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Text variant="h3" style={{ color: C.text }}>
                Meal idea
              </Text>
              {ideaMeal ? (
                <View style={styles.gap}>
                  <Text variant="bodyMed" style={{ color: C.text }}>
                    {ideaMeal.name}
                  </Text>
                  {ideaMeal.items.map((item) => (
                    <Text key={item} variant="label" style={{ color: C.textSecondary }}>
                      • {item}
                    </Text>
                  ))}
                  <Text variant="caption" style={{ color: C.textMuted }}>
                    {ideaMeal.calories} kcal · P {ideaMeal.proteinG} g · C {ideaMeal.carbsG} g · F {ideaMeal.fatG} g
                  </Text>
                  <PrimaryButton
                    label="I ate this"
                    loading={logFood.isPending}
                    onPress={async () => {
                      // Keep the idea on failure so retrying doesn't use up another suggestion.
                      const saved = await save({
                        description: ideaMeal.name,
                        calories: ideaMeal.calories,
                        proteinG: ideaMeal.proteinG,
                        carbsG: ideaMeal.carbsG,
                        fatG: ideaMeal.fatG,
                      });
                      if (saved) setIdea(null);
                    }}
                  />
                  <TextButton label="Another idea" onPress={suggest} />
                </View>
              ) : (
                <>
                  <Text variant="caption" style={{ color: C.textSecondary }}>
                    A meal that fits the calories and protein you have left today.
                  </Text>
                  <PrimaryButton
                    label="Suggest a meal"
                    onPress={suggest}
                    loading={mealIdea.isPending}
                    disabled={ideasLeft === 0}
                  />
                  {ideasLeft !== undefined && (
                    <Text variant="caption" style={{ color: C.textMuted, textAlign: 'center' }}>
                      {ideasLeft} meal ideas left this month
                    </Text>
                  )}
                </>
              )}
            </View>
          )}

          {/* The day's log */}
          <Text variant="label" style={[styles.sectionLabel, { color: C.textSecondary }]}>
            MEALS
          </Text>
          {logsQ.isError ? (
            <View style={styles.gap}>
              <Notice tone="error">{formatApiError(logsQ.error, 'Could not load meals.')}</Notice>
              <TextButton label="Try again" onPress={() => logsQ.refetch()} />
            </View>
          ) : (logsQ.data ?? []).length === 0 ? (
            <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border, alignItems: 'center' }]}>
              <Text variant="label" style={{ color: C.textSecondary }}>
                {isToday ? 'Nothing logged yet today.' : 'Nothing logged this day.'}
              </Text>
            </View>
          ) : (
            <View style={[styles.list, { backgroundColor: C.surface, borderColor: C.border }]}>
              {logsQ.data!.map((log, i) => (
                <View
                  key={log.id}
                  style={[styles.logRow, i > 0 && { borderTopWidth: 1, borderTopColor: C.border }]}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="bodyMed" style={{ color: C.text }} numberOfLines={2}>
                      {log.description}
                    </Text>
                    <Text variant="caption" style={{ color: C.textMuted }}>
                      {new Date(log.loggedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      {log.proteinG !== null ? ` · P ${Math.round(Number(log.proteinG))} g` : ''}
                    </Text>
                  </View>
                  <Text variant="bodyMed" style={{ color: C.text }}>
                    {log.calories ?? '—'} kcal
                  </Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 8 },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, paddingBottom: 8 },
  content: { padding: 16, paddingBottom: 40 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 12, marginBottom: 16 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, minHeight: 56 },
  row: { flexDirection: 'row', gap: 10 },
  gap: { gap: 8 },
  estimate: { borderRadius: 12, padding: 12, gap: 4 },
  sectionLabel: { marginBottom: 8, letterSpacing: 0.8 },
  list: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
});
