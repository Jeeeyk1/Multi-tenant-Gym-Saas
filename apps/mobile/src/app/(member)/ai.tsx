import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator, TextInput, Modal, KeyboardAvoidingView, Platform, Alert, Image, TouchableOpacity } from 'react-native';
import { Text } from '../../components/Text';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Animated } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { AppLoader } from '../../components/AppLoader';
import { useAuth } from '../../context/AuthContext';
import { useMyMember, useMyProfile } from '../../hooks/members';
import { AiGeneratingLoader } from '../../components/AiGeneratingLoader';
import { aiService } from '../../services/ai.service';
import { formatApiError } from '../../lib/format-error';
import { SPACING, FONT, RADIUS, type ColorPalette } from '../../constants/theme';
import type { FoodLog, MealAnalysis, MealPlan, MealPlanMode, MealPlanRequest, WorkoutWeekPlan, WorkoutDay, WorkoutExercise, ExerciseInstructions, WorkoutPlanRequest, WorkoutFocus, WorkoutEmphasis } from '../../types';

type Tab = 'workout' | 'nutrition' | 'diary';

const WORKOUT_LOADING_MESSAGES = [
  'Warming up…',
  'Choosing your exercises…',
  'Balancing your week…',
  'Adding form tips…',
  'Almost ready…',
];

const MEAL_LOADING_MESSAGES = [
  'Checking your goals…',
  'Balancing your macros…',
  'Plating your meals…',
  'Almost ready…',
];

export default function AIScreen() {
  const { theme } = useTheme();
  const C = theme.colors;
  const styles = useMemo(() => makeStyles(C), [C]);
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('workout');
  const memberQ = useMyMember();
  const memberId = memberQ.data?.id ?? null;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={theme.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <Ionicons name="flash" size={22} color="#000" />
        <Text style={styles.headerTitle}>AI Coach</Text>
      </LinearGradient>

      <View style={styles.tabs}>
        {(['workout', 'nutrition', 'diary'] as Tab[]).map((t) => (
          <Pressable
            key={t}
            style={[styles.tab, activeTab === t && styles.tabActive, activeTab === t && { borderBottomColor: theme.primary }]}
            onPress={() => setActiveTab(t)}
          >
            <Text style={[styles.tabText, activeTab === t && styles.tabTextActive, activeTab === t && { color: theme.primary }]}>
              {t === 'workout' ? 'Workout' : t === 'nutrition' ? 'Meal Plan' : 'Food Diary'}
            </Text>
          </Pressable>
        ))}
      </View>

      {activeTab === 'workout' && (
        <WorkoutTab gymId={user?.gymId ?? ''} memberId={memberId} theme={theme} />
      )}
      {activeTab === 'nutrition' && (
        <NutritionTab gymId={user?.gymId ?? ''} memberId={memberId} theme={theme} />
      )}
      {activeTab === 'diary' && (
        <DiaryTab gymId={user?.gymId ?? ''} memberId={memberId} theme={theme} />
      )}
    </View>
  );
}

// ─── Workout Tab ──────────────────────────────────────────────────────────────

const TODAY_NAME = new Date().toLocaleDateString('en-US', { weekday: 'long' });

function WorkoutTab({ gymId, memberId, theme }: TabProps) {
  const C = theme.colors;
  const styles = useMemo(() => makeStyles(C), [C]);
  const profileQ = useMyProfile();
  const [weekPlan, setWeekPlan] = useState<WorkoutWeekPlan | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialising, setInitialising] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<WorkoutExercise | null>(null);
  const [swapTarget, setSwapTarget] = useState<{ day: string; sectionTitle: string; ex: WorkoutExercise } | null>(null);
  const [swappingKey, setSwappingKey] = useState<string | null>(null);
  const instructionsCache = useRef<Map<string, ExerciseInstructions>>(new Map());
  const gifCache = useRef<Map<string, string | null>>(new Map());

  const applyPlan = (parsed: WorkoutWeekPlan, generatedDate?: string) => {
    if (!Array.isArray(parsed.weekPlan) || parsed.weekPlan.length === 0) return;
    setWeekPlan(parsed);
    const todayEntry = parsed.weekPlan.find((d) => d.day === TODAY_NAME);
    setSelectedDay(todayEntry ? todayEntry.day : (parsed.weekPlan[0]?.day ?? null));
    if (generatedDate) setGeneratedAt(generatedDate);
  };

  useEffect(() => {
    if (!gymId || !memberId) return;
    aiService
      .getLatestWorkoutPlan(gymId, memberId)
      .then((saved) => {
        if (saved) {
          try { applyPlan(JSON.parse(saved.suggestion), saved.generatedAt); } catch { /* stale plan */ }
        }
      })
      .catch(() => {})
      .finally(() => setInitialising(false));
  }, [gymId, memberId]);

  const generate = useCallback(
    async (params: WorkoutPlanRequest) => {
      if (!gymId || !memberId) return;
      setShowModal(false);
      setLoading(true);
      try {
        const res = await aiService.getWorkoutSuggestion(gymId, memberId, params);
        applyPlan(JSON.parse(res.suggestion), new Date().toISOString());
      } catch (err) {
        Alert.alert('Error', formatApiError(err, 'Could not generate workout plan. Try again.'));
      } finally {
        setLoading(false);
      }
    },
    [gymId, memberId],
  );

  const swapExercise = useCallback(
    async (dayName: string, sectionTitle: string, ex: WorkoutExercise, reason?: string) => {
      if (!gymId || !memberId) return;
      const key = `${dayName}|${sectionTitle}|${ex.name}`;
      setSwappingKey(key);
      try {
        const res = await aiService.swapWorkoutExercise(gymId, memberId, {
          day: dayName,
          sectionTitle,
          exerciseName: ex.name,
          reason: reason?.trim() || undefined,
        });
        setWeekPlan((prev) => replaceExercise(prev, dayName, sectionTitle, ex.name, res.exercise));
      } catch {
        Alert.alert('Swap failed', 'Could not find an alternative right now. Please try again.');
      } finally {
        setSwappingKey(null);
      }
    },
    [gymId, memberId],
  );

  const profile = profileQ.data;
  const defaultDays = profile?.daysPerWeek ?? 3;
  const defaultEmphasis = fitnessGoalToEmphasis(profile?.fitnessGoal);

  const activeDay: WorkoutDay | null =
    weekPlan?.weekPlan?.find((d) => d.day === selectedDay) ?? null;

  const planDate = generatedAt
    ? new Date(generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;

  return (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabContentInner}>
      {/* Generate button */}
      <Pressable
        style={[styles.generateBtn, { backgroundColor: theme.primary }, (loading || initialising) && styles.generateBtnDisabled]}
        onPress={() => setShowModal(true)}
        disabled={loading || initialising || !memberId}
      >
        {loading ? (
          <ActivityIndicator color="#000" size="small" />
        ) : (
          <>
            <Ionicons name="flash-outline" size={16} color="#000" />
            <Text style={styles.generateBtnText}>{weekPlan ? 'Regenerate Plan' : 'Generate Weekly Plan'}</Text>
          </>
        )}
      </Pressable>

      {initialising && (
        <View style={{ marginTop: SPACING.md, alignItems: 'center' }}>
          <AppLoader />
        </View>
      )}

      {loading && (
        <AiGeneratingLoader
          icon="barbell"
          title="Building your plan"
          messages={WORKOUT_LOADING_MESSAGES}
        />
      )}

      {weekPlan && !initialising && !loading && (
        <>
          {/* Day selector pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayPillRow}>
            {weekPlan.weekPlan.map((d) => {
              const isActive = d.day === selectedDay;
              const isToday = d.day === TODAY_NAME;
              return (
                <Pressable
                  key={d.day}
                  style={[
                    styles.dayPill,
                    isActive && { backgroundColor: theme.primary, borderColor: theme.primary },
                  ]}
                  onPress={() => setSelectedDay(d.day)}
                >
                  <Text style={[styles.dayPillText, isActive && styles.dayPillTextActive]}>
                    {d.day.slice(0, 3)}
                  </Text>
                  {isToday && <View style={[styles.todayDot, { backgroundColor: isActive ? '#000' : theme.primary }]} />}
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Active day header */}
          {activeDay && (
            <>
              <View style={[styles.planHeader, { backgroundColor: theme.primary + '18', borderColor: theme.primary + '30' }]}>
                <View style={styles.planHeaderRow}>
                  <Ionicons name="barbell-outline" size={20} color={theme.primary} />
                  <Text style={[styles.planFocus, { color: theme.primary }]}>{activeDay.focus}</Text>
                </View>
                <View style={styles.planMeta}>
                  <View style={styles.planMetaItem}>
                    <Ionicons name="time-outline" size={13} color={C.textSecondary} />
                    <Text style={styles.planMetaText}>{activeDay.totalDurationMin} min</Text>
                  </View>
                  {planDate && (
                    <View style={styles.planMetaItem}>
                      <Ionicons name="calendar-outline" size={13} color={C.textSecondary} />
                      <Text style={styles.planMetaText}>Generated {planDate}</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Exercise sections */}
              {activeDay.sections.map((section) => (
                <View key={section.title} style={styles.sectionBlock}>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.exerciseRow}>
                    {section.exercises.map((ex, i) => (
                      <Pressable
                        key={i}
                        style={[styles.exerciseCard, { borderColor: theme.primary + '30' }]}
                        onPress={() => setSelectedExercise(ex)}
                      >
                        <Text style={styles.exerciseName}>{ex.name}</Text>
                        <View style={styles.exerciseStats}>
                          {ex.sets != null && (
                            <View style={[styles.statPill, { backgroundColor: theme.primary + '15' }]}>
                              <Text style={[styles.statValue, { color: theme.primary }]}>{ex.sets}</Text>
                              <Text style={styles.statLabel}>sets</Text>
                            </View>
                          )}
                          {ex.reps != null && (
                            <View style={[styles.statPill, { backgroundColor: theme.primary + '15' }]}>
                              <Text style={[styles.statValue, { color: theme.primary }]}>{ex.reps}</Text>
                              <Text style={styles.statLabel}>reps</Text>
                            </View>
                          )}
                          {ex.restSec != null && (
                            <View style={styles.statPill}>
                              <Ionicons name="timer-outline" size={11} color={C.textMuted} />
                              <Text style={[styles.statValue, { color: C.textSecondary }]}>{ex.restSec}s</Text>
                              <Text style={styles.statLabel}>rest</Text>
                            </View>
                          )}
                        </View>
                        {ex.tip && (
                          <View style={styles.tipRow}>
                            <Ionicons name="information-circle-outline" size={13} color={C.textMuted} />
                            <Text style={styles.tipText}>{ex.tip}</Text>
                          </View>
                        )}
                        <View style={styles.cardFooter}>
                          <View style={styles.cardTapHint}>
                            <Ionicons name="chevron-forward" size={12} color={C.textMuted} />
                            <Text style={styles.cardTapHintText}>How to do it</Text>
                          </View>
                          <Pressable
                            onPress={() => setSwapTarget({ day: activeDay.day, sectionTitle: section.title, ex })}
                            disabled={swappingKey !== null}
                            hitSlop={8}
                            style={[styles.swapBtn, { backgroundColor: theme.primary + '15' }]}
                          >
                            {swappingKey === `${activeDay.day}|${section.title}|${ex.name}` ? (
                              <ActivityIndicator size="small" color={theme.primary} />
                            ) : (
                              <>
                                <Ionicons name="swap-horizontal" size={13} color={theme.primary} />
                                <Text style={[styles.swapBtnText, { color: theme.primary }]}>Swap</Text>
                              </>
                            )}
                          </Pressable>
                        </View>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              ))}
            </>
          )}
        </>
      )}

      {/* Empty state */}
      {!weekPlan && !initialising && !loading && (
        <View style={styles.workoutEmpty}>
          <View style={[styles.iconCircle, { backgroundColor: theme.primary + '18' }]}>
            <Ionicons name="barbell-outline" size={32} color={theme.primary} />
          </View>
          <Text style={styles.heroTitle}>Weekly Workout Plan</Text>
          <Text style={styles.heroSub}>
            Generate a full week of personalised sessions based on your goals and how many days you train.
          </Text>
        </View>
      )}

      {/* Exercise detail modal */}
      {selectedExercise && memberId && (
        <ExerciseDetailModal
          exercise={selectedExercise}
          gymId={gymId}
          memberId={memberId}
          theme={theme}
          cache={instructionsCache}
          gifCache={gifCache}
          onClose={() => setSelectedExercise(null)}
        />
      )}

      {/* Guided plan-request wizard */}
      <WorkoutPlanModal
        visible={showModal}
        theme={theme}
        defaultDays={defaultDays}
        defaultEmphasis={defaultEmphasis}
        onClose={() => setShowModal(false)}
        onGenerate={generate}
      />

      {/* Swap-exercise reason sheet */}
      <SwapExerciseModal
        target={swapTarget}
        theme={theme}
        onClose={() => setSwapTarget(null)}
        onConfirm={(reason) => {
          const t = swapTarget;
          setSwapTarget(null);
          if (t) swapExercise(t.day, t.sectionTitle, t.ex, reason);
        }}
      />
    </ScrollView>
  );
}

const SWAP_REASONS = ['No equipment for this', 'Too hard', 'Too easy', "Don't like it"];

function SwapExerciseModal({
  target,
  theme,
  onClose,
  onConfirm,
}: {
  target: { day: string; sectionTitle: string; ex: WorkoutExercise } | null;
  theme: ReturnType<typeof useTheme>['theme'];
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const C = theme.colors;
  const styles = useMemo(() => makeStyles(C), [C]);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (target) setReason('');
  }, [target]);

  return (
    <Modal visible={target !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Swap exercise</Text>
          <Pressable onPress={onClose}>
            <Ionicons name="close" size={24} color={C.text} />
          </Pressable>
        </View>

        <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: SPACING.md }}>
          {target && (
            <View style={[styles.swapCurrentCard, { borderColor: theme.primary + '30' }]}>
              <Ionicons name="barbell-outline" size={18} color={theme.primary} />
              <Text style={styles.swapCurrentName}>{target.ex.name}</Text>
            </View>
          )}

          <View>
            <Text style={styles.inputLabel}>Why swap it? (optional)</Text>
            <Text style={styles.inputHint}>
              Tell the coach and it&apos;ll avoid similar ones — e.g. no barbell, no cable machine.
            </Text>
          </View>

          <View style={styles.swapChips}>
            {SWAP_REASONS.map((r) => {
              const active = reason === r;
              return (
                <Pressable
                  key={r}
                  onPress={() => setReason(active ? '' : r)}
                  style={[
                    styles.swapChip,
                    { borderColor: active ? theme.primary : C.border, backgroundColor: active ? theme.primary + '18' : 'transparent' },
                  ]}
                >
                  <Text style={[styles.swapChipText, { color: active ? theme.primary : C.textSecondary }]}>{r}</Text>
                </Pressable>
              );
            })}
          </View>

          <TextInput
            style={styles.mealInput}
            placeholder="Or type a reason…"
            placeholderTextColor={C.textMuted}
            value={reason}
            onChangeText={setReason}
            maxLength={200}
          />

          <Pressable
            style={[styles.generateBtn, styles.mealGenerateBtn, { backgroundColor: theme.primary }]}
            onPress={() => onConfirm(reason)}
          >
            <Ionicons name="swap-horizontal" size={16} color="#000" />
            <Text style={styles.generateBtnText}>Find alternative</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Immutably swap a single exercise (matched by day + section + name) in the week plan. */
function replaceExercise(
  plan: WorkoutWeekPlan | null,
  dayName: string,
  sectionTitle: string,
  oldName: string,
  next: WorkoutExercise,
): WorkoutWeekPlan | null {
  if (!plan) return plan;
  return {
    ...plan,
    weekPlan: plan.weekPlan.map((d) =>
      d.day !== dayName
        ? d
        : {
            ...d,
            sections: d.sections.map((s) =>
              s.title !== sectionTitle
                ? s
                : { ...s, exercises: s.exercises.map((e) => (e.name === oldName ? next : e)) },
            ),
          },
    ),
  };
}

function fitnessGoalToEmphasis(goal: string | null | undefined): WorkoutEmphasis {
  switch (goal) {
    case 'LOSE_WEIGHT':
      return 'BURN_FAT';
    case 'BUILD_MUSCLE':
      return 'BUILD_MUSCLE';
    default:
      return 'BALANCED';
  }
}

// ─── Workout Plan: guided animated question flow ──────────────────────────────

type WizardIcon = React.ComponentProps<typeof Ionicons>['name'];
type WorkoutStepKey = 'focus' | 'emphasis' | 'days' | 'length' | 'review';
const WORKOUT_STEPS: WorkoutStepKey[] = ['focus', 'emphasis', 'days', 'length', 'review'];

const FOCUS_OPTIONS: { value: WorkoutFocus; icon: WizardIcon; title: string; sub: string }[] = [
  { value: 'AUTO', icon: 'sparkles-outline', title: 'Let the coach decide', sub: 'Balanced split from your profile' },
  { value: 'FULL_BODY', icon: 'body-outline', title: 'Full body', sub: 'Everything, every session' },
  { value: 'UPPER_BODY', icon: 'barbell-outline', title: 'Upper body', sub: 'Chest, back, shoulders, arms' },
  { value: 'LOWER_BODY', icon: 'walk-outline', title: 'Lower body', sub: 'Legs and glutes' },
  { value: 'CORE', icon: 'fitness-outline', title: 'Core & abs', sub: 'Midsection and stability' },
];

const EMPHASIS_OPTIONS: { value: WorkoutEmphasis; icon: WizardIcon; title: string; sub: string }[] = [
  { value: 'BALANCED', icon: 'options-outline', title: 'Balanced', sub: 'A bit of everything' },
  { value: 'BUILD_MUSCLE', icon: 'barbell-outline', title: 'Build muscle', sub: 'Hypertrophy, moderate-heavy' },
  { value: 'BURN_FAT', icon: 'flame-outline', title: 'Burn fat', sub: 'Higher reps, short rest' },
  { value: 'STRENGTH', icon: 'trending-up-outline', title: 'Get stronger', sub: 'Heavy, low reps' },
  { value: 'ENDURANCE', icon: 'pulse-outline', title: 'Endurance', sub: 'High reps, conditioning' },
];

const DAY_OPTIONS = [2, 3, 4, 5, 6];
const LENGTH_OPTIONS = [30, 45, 60, 75];

function focusLabel(v: WorkoutFocus): string {
  return FOCUS_OPTIONS.find((o) => o.value === v)?.title ?? 'Balanced';
}
function emphasisLabel(v: WorkoutEmphasis): string {
  return EMPHASIS_OPTIONS.find((o) => o.value === v)?.title ?? 'Balanced';
}

function WorkoutPlanModal({
  visible,
  theme,
  defaultDays,
  defaultEmphasis,
  onClose,
  onGenerate,
}: {
  visible: boolean;
  theme: ReturnType<typeof useTheme>['theme'];
  defaultDays: number;
  defaultEmphasis: WorkoutEmphasis;
  onClose: () => void;
  onGenerate: (params: WorkoutPlanRequest) => void;
}) {
  const C = theme.colors;
  const styles = useMemo(() => makeStyles(C), [C]);

  const [stepIndex, setStepIndex] = useState(0);
  const [focus, setFocus] = useState<WorkoutFocus>('AUTO');
  const [emphasis, setEmphasis] = useState<WorkoutEmphasis>(defaultEmphasis);
  const [days, setDays] = useState(defaultDays);
  const [length, setLength] = useState(45);

  const anim = useRef(new Animated.Value(1)).current;
  const dirRef = useRef(1);

  // Reset to profile defaults each time the wizard opens.
  useEffect(() => {
    if (visible) {
      setStepIndex(0);
      setFocus('AUTO');
      setEmphasis(defaultEmphasis);
      setDays(defaultDays);
      setLength(45);
    }
  }, [visible, defaultDays, defaultEmphasis]);

  // Slide + fade the question in whenever the step changes.
  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration: 260, useNativeDriver: true }).start();
  }, [stepIndex, anim]);

  const step = WORKOUT_STEPS[stepIndex];
  const goNext = () => { dirRef.current = 1; setStepIndex((i) => Math.min(i + 1, WORKOUT_STEPS.length - 1)); };
  const goBack = () => { dirRef.current = -1; setStepIndex((i) => Math.max(i - 1, 0)); };

  // Register the choice visually, then glide to the next question.
  const pick = (apply: () => void) => {
    apply();
    setTimeout(goNext, 220);
  };

  const submit = () => {
    onGenerate({
      focus: focus === 'AUTO' ? undefined : focus, // AUTO defers to the member's profile/goal
      emphasis,
      daysPerWeek: days,
      sessionMinutes: length,
    });
  };

  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [dirRef.current * 36, 0] });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Build my plan</Text>
          <Pressable onPress={onClose}>
            <Ionicons name="close" size={24} color={C.text} />
          </Pressable>
        </View>

        {/* Progress dots */}
        <View style={styles.wizardProgress}>
          {WORKOUT_STEPS.map((key, i) => (
            <View
              key={key}
              style={[
                styles.wizardDot,
                i <= stepIndex && { backgroundColor: theme.primary },
                i === stepIndex && styles.wizardDotActive,
              ]}
            />
          ))}
        </View>

        <Animated.View style={[styles.wizardBody, { opacity: anim, transform: [{ translateX }] }]}>
          {step === 'focus' && (
            <WizardQuestion styles={styles} title="What do you want to focus on?" sub="Pick a target area for this week.">
              {FOCUS_OPTIONS.map((o) => (
                <OptionCard
                  key={o.value}
                  theme={theme}
                  icon={o.icon}
                  title={o.title}
                  sub={o.sub}
                  selected={focus === o.value}
                  onPress={() => pick(() => setFocus(o.value))}
                />
              ))}
            </WizardQuestion>
          )}

          {step === 'emphasis' && (
            <WizardQuestion styles={styles} title="What's the goal for this plan?" sub="This shapes reps, rest and intensity.">
              {EMPHASIS_OPTIONS.map((o) => (
                <OptionCard
                  key={o.value}
                  theme={theme}
                  icon={o.icon}
                  title={o.title}
                  sub={o.sub}
                  selected={emphasis === o.value}
                  onPress={() => pick(() => setEmphasis(o.value))}
                />
              ))}
            </WizardQuestion>
          )}

          {step === 'days' && (
            <WizardQuestion styles={styles} title="How many days a week?" sub="We'll spread the sessions out.">
              <View style={styles.segmentRow}>
                {DAY_OPTIONS.map((n) => (
                  <Pressable
                    key={n}
                    style={[styles.segment, days === n && { backgroundColor: theme.primary, borderColor: theme.primary }]}
                    onPress={() => pick(() => setDays(n))}
                  >
                    <Text style={[styles.segmentText, days === n && { color: '#000' }]}>{n}</Text>
                  </Pressable>
                ))}
              </View>
            </WizardQuestion>
          )}

          {step === 'length' && (
            <WizardQuestion styles={styles} title="How long per session?" sub="Roughly how much time you have.">
              <View style={styles.segmentRow}>
                {LENGTH_OPTIONS.map((n) => (
                  <Pressable
                    key={n}
                    style={[styles.segment, length === n && { backgroundColor: theme.primary, borderColor: theme.primary }]}
                    onPress={() => pick(() => setLength(n))}
                  >
                    <Text style={[styles.segmentText, length === n && { color: '#000' }]}>{n}m</Text>
                  </Pressable>
                ))}
              </View>
            </WizardQuestion>
          )}

          {step === 'review' && (
            <WizardQuestion styles={styles} title="Ready to go" sub="Here's what your coach will build.">
              <View style={styles.reviewCard}>
                <ReviewRow styles={styles} C={C} icon="locate-outline" label="Focus" value={focusLabel(focus)} />
                <ReviewRow styles={styles} C={C} icon="trophy-outline" label="Goal" value={emphasisLabel(emphasis)} />
                <ReviewRow styles={styles} C={C} icon="calendar-outline" label="Days / week" value={String(days)} />
                <ReviewRow styles={styles} C={C} icon="time-outline" label="Session" value={`${length} min`} />
              </View>
              <Pressable style={[styles.generateBtn, styles.mealGenerateBtn, { backgroundColor: theme.primary }]} onPress={submit}>
                <Ionicons name="flash-outline" size={16} color="#000" />
                <Text style={styles.generateBtnText}>Generate My Plan</Text>
              </Pressable>
            </WizardQuestion>
          )}
        </Animated.View>

        {stepIndex > 0 && (
          <Pressable style={styles.retakeBtn} onPress={goBack}>
            <Ionicons name="arrow-back" size={15} color={C.textMuted} />
            <Text style={styles.retakeBtnText}>Back</Text>
          </Pressable>
        )}
      </View>
    </Modal>
  );
}

function WizardQuestion({
  styles,
  title,
  sub,
  children,
}: {
  styles: ReturnType<typeof makeStyles>;
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.wizardQuestion} keyboardShouldPersistTaps="handled">
      <Text style={styles.wizardQTitle}>{title}</Text>
      <Text style={styles.wizardQSub}>{sub}</Text>
      <View style={{ gap: SPACING.sm }}>{children}</View>
    </ScrollView>
  );
}

function OptionCard({
  theme,
  icon,
  title,
  sub,
  selected,
  onPress,
}: {
  theme: ReturnType<typeof useTheme>['theme'];
  icon: WizardIcon;
  title: string;
  sub: string;
  selected: boolean;
  onPress: () => void;
}) {
  const C = theme.colors;
  const styles = useMemo(() => makeStyles(C), [C]);
  return (
    <Pressable
      style={[
        styles.optionCard,
        { borderColor: selected ? theme.primary : C.border, backgroundColor: selected ? theme.primary + '14' : 'transparent' },
      ]}
      onPress={onPress}
    >
      <View style={[styles.optionIcon, { backgroundColor: theme.primary + '18' }]}>
        <Ionicons name={icon} size={20} color={theme.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionSub}>{sub}</Text>
      </View>
      <Ionicons
        name={selected ? 'checkmark-circle' : 'chevron-forward'}
        size={selected ? 22 : 18}
        color={selected ? theme.primary : C.textMuted}
      />
    </Pressable>
  );
}

function ReviewRow({
  styles,
  C,
  icon,
  label,
  value,
}: {
  styles: ReturnType<typeof makeStyles>;
  C: ColorPalette;
  icon: WizardIcon;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.reviewRow}>
      <Ionicons name={icon} size={16} color={C.textSecondary} />
      <Text style={styles.reviewLabel}>{label}</Text>
      <Text style={styles.reviewValue}>{value}</Text>
    </View>
  );
}

// ─── Exercise Detail Modal ────────────────────────────────────────────────────

function ExerciseDetailModal({
  exercise,
  gymId,
  memberId,
  theme,
  cache,
  gifCache,
  onClose,
}: {
  exercise: WorkoutExercise;
  gymId: string;
  memberId: string;
  theme: ReturnType<typeof useTheme>['theme'];
  cache: React.RefObject<Map<string, ExerciseInstructions>>;
  gifCache: React.RefObject<Map<string, string | null>>;
  onClose: () => void;
}) {
  const C = theme.colors;
  const styles = useMemo(() => makeStyles(C), [C]);
  const [instructions, setInstructions] = useState<ExerciseInstructions | null>(
    cache.current.get(exercise.name) ?? null,
  );
  const [loading, setLoading] = useState(!cache.current.has(exercise.name));
  const [gifUrl, setGifUrl] = useState<string | null>(
    gifCache.current.has(exercise.name) ? (gifCache.current.get(exercise.name) ?? null) : null,
  );

  useEffect(() => {
    if (cache.current.has(exercise.name)) return;
    aiService
      .getExerciseInstructions(gymId, memberId, exercise.name)
      .then((data) => {
        cache.current.set(exercise.name, data);
        setInstructions(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [exercise.name, gymId, memberId, cache]);

  useEffect(() => {
    if (gifCache.current.has(exercise.name)) return;
    aiService
      .getExerciseMedia(gymId, memberId, exercise.name)
      .then(({ gifUrl: url }) => {
        gifCache.current.set(exercise.name, url);
        setGifUrl(url);
      })
      .catch(() => gifCache.current.set(exercise.name, null));
  }, [exercise.name, gymId, memberId, gifCache]);

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.exModalContainer}>
        {/* Header */}
        <View style={styles.exModalHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.exModalTitle}>{exercise.name}</Text>
            {/* Sets / reps / rest summary */}
            <View style={styles.exModalStats}>
              {exercise.sets != null && (
                <Text style={[styles.exModalStat, { color: theme.primary }]}>{exercise.sets} sets</Text>
              )}
              {exercise.reps != null && (
                <Text style={[styles.exModalStat, { color: theme.primary }]}>{exercise.reps} reps</Text>
              )}
              {exercise.restSec != null && (
                <Text style={styles.exModalStat}>{exercise.restSec}s rest</Text>
              )}
            </View>
          </View>
          <Pressable onPress={onClose} style={styles.exModalClose}>
            <Ionicons name="close" size={22} color={C.textMuted} />
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.exModalLoading}>
            <AppLoader />
            <Text style={styles.exModalLoadingText}>Loading instructions…</Text>
          </View>
        ) : !instructions ? (
          <View style={styles.exModalLoading}>
            <Ionicons name="alert-circle-outline" size={36} color={C.textMuted} />
            <Text style={styles.exModalLoadingText}>Could not load instructions</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.exModalBody}>

            {/* Exercise GIF */}
            {gifUrl ? (
              <Image
                source={{ uri: gifUrl }}
                style={styles.exModalGif}
                resizeMode="contain"
              />
            ) : null}

            {/* Target muscles */}
            <View style={styles.exSection}>
              <Text style={styles.exSectionLabel}>Target Muscles</Text>
              <View style={styles.muscleRow}>
                {instructions.targetMuscles.map((m) => (
                  <View key={m} style={[styles.musclePill, { backgroundColor: theme.primary + '18' }]}>
                    <Text style={[styles.musclePillText, { color: theme.primary }]}>{m}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Steps */}
            <View style={styles.exSection}>
              <Text style={styles.exSectionLabel}>How To Do It</Text>
              {instructions.steps.map((step, i) => (
                <View key={i} style={styles.stepRow}>
                  <View style={[styles.stepNum, { backgroundColor: theme.primary }]}>
                    <Text style={styles.stepNumText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>

            {/* Common mistakes */}
            <View style={styles.exSection}>
              <Text style={styles.exSectionLabel}>Common Mistakes</Text>
              {instructions.commonMistakes.map((m, i) => (
                <View key={i} style={styles.mistakeRow}>
                  <Ionicons name="close-circle-outline" size={16} color={C.error} />
                  <Text style={styles.mistakeText}>{m}</Text>
                </View>
              ))}
            </View>

            {/* Modifications */}
            <View style={styles.exSection}>
              <Text style={styles.exSectionLabel}>Modifications</Text>
              <View style={styles.modCard}>
                <View style={styles.modRow}>
                  <Ionicons name="arrow-down-circle-outline" size={16} color={C.textMuted} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modLabel}>Easier</Text>
                    <Text style={styles.modText}>{instructions.easier}</Text>
                  </View>
                </View>
                <View style={[styles.modRow, { marginTop: SPACING.sm }]}>
                  <Ionicons name="arrow-up-circle-outline" size={16} color={theme.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modLabel, { color: theme.primary }]}>Harder</Text>
                    <Text style={styles.modText}>{instructions.harder}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Form tip from plan */}
            {exercise.tip && (
              <View style={[styles.exSection, styles.tipCard]}>
                <Ionicons name="bulb-outline" size={15} color={theme.primary} />
                <Text style={styles.tipCardText}>{exercise.tip}</Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

// ─── Nutrition Tab ────────────────────────────────────────────────────────────

/** Parse a persisted/generated meal-plan JSON string; null if it isn't structured. */
function parseMealPlan(raw: string | null): MealPlan | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw);
    if (p && Array.isArray(p.meals) && p.meals.length > 0) return p as MealPlan;
  } catch {
    // Legacy plain-text plan (pre-structured) — caller falls back to text.
  }
  return null;
}

function NutritionTab({ gymId, memberId, theme }: TabProps) {
  const C = theme.colors;
  const styles = useMemo(() => makeStyles(C), [C]);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialising, setInitialising] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Load the saved plan on mount so it survives navigating away and back
  // (mirrors the workout tab — the plan is persisted server-side per member).
  useEffect(() => {
    if (!gymId || !memberId) return;
    aiService
      .getLatestMealPlan(gymId, memberId)
      .then((saved) => {
        if (saved) {
          setSuggestion(saved.suggestion);
          setGeneratedAt(saved.generatedAt);
        }
      })
      .catch(() => {})
      .finally(() => setInitialising(false));
  }, [gymId, memberId]);

  const generate = useCallback(
    async (params: MealPlanRequest) => {
      if (!gymId || !memberId) return;
      setShowModal(false);
      setLoading(true);
      try {
        const res = await aiService.getMealSuggestion(gymId, memberId, params);
        setSuggestion(res.suggestion);
        setGeneratedAt(new Date().toISOString());
      } catch (err) {
        Alert.alert('Error', formatApiError(err, 'Could not generate meal plan. Try again.'));
      } finally {
        setLoading(false);
      }
    },
    [gymId, memberId],
  );

  const plan = useMemo(() => parseMealPlan(suggestion), [suggestion]);

  return (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabContentInner}>
      <View style={styles.heroCard}>
        <View style={[styles.iconCircle, { backgroundColor: theme.primary + '18' }]}>
          <Ionicons name="nutrition-outline" size={32} color={theme.primary} />
        </View>
        <Text style={styles.heroTitle}>Meal Plan</Text>
        <Text style={styles.heroSub}>
          Tell the coach what you need and get a meal plan tailored to your goal and macros.
        </Text>
        <Pressable
          style={[styles.generateBtn, { backgroundColor: theme.primary }, (loading || initialising) && styles.generateBtnDisabled]}
          onPress={() => setShowModal(true)}
          disabled={loading || initialising || !memberId}
        >
          {loading ? (
            <ActivityIndicator color="#000" size="small" />
          ) : (
            <>
              <Ionicons name="flash-outline" size={16} color="#000" />
              <Text style={styles.generateBtnText}>{suggestion ? 'New Meal Plan' : 'Create Meal Plan'}</Text>
            </>
          )}
        </Pressable>
      </View>

      {loading && (
        <AiGeneratingLoader
          icon="nutrition"
          title="Building your meal plan"
          messages={MEAL_LOADING_MESSAGES}
        />
      )}

      {initialising && !loading && (
        <View style={styles.mealLoading}>
          <AppLoader />
        </View>
      )}

      {!loading && !initialising && plan && (
        <MealPlanView plan={plan} generatedAt={generatedAt} theme={theme} />
      )}

      {/* Legacy plain-text plan fallback (pre-structured) */}
      {!loading && !initialising && !plan && suggestion && (
        <SuggestionCard text={suggestion} icon="nutrition-outline" theme={theme} generatedAt={generatedAt} />
      )}

      <MealPlanModal
        visible={showModal}
        theme={theme}
        onClose={() => setShowModal(false)}
        onGenerate={generate}
      />
    </ScrollView>
  );
}

// ─── Meal Plan: guided request modal ──────────────────────────────────────────

function MealPlanModal({
  visible,
  theme,
  onClose,
  onGenerate,
}: {
  visible: boolean;
  theme: ReturnType<typeof useTheme>['theme'];
  onClose: () => void;
  onGenerate: (params: MealPlanRequest) => void;
}) {
  const C = theme.colors;
  const styles = useMemo(() => makeStyles(C), [C]);
  const [mode, setMode] = useState<MealPlanMode | null>(null);
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [mealCount, setMealCount] = useState(3);

  const reset = () => {
    setMode(null);
    setCalories('');
    setProtein('');
    setMealCount(3);
  };
  const close = () => { reset(); onClose(); };

  const submit = () => {
    if (!mode) return;
    const cal = parseInt(calories, 10);
    const prot = parseInt(protein, 10);
    onGenerate({
      mode,
      targetCalories: Number.isFinite(cal) && cal > 0 ? cal : undefined,
      mealCount: mode === 'FULL_DAY' ? mealCount : undefined,
      targetProteinG: mode === 'SINGLE_MEAL' && Number.isFinite(prot) && prot > 0 ? prot : undefined,
    });
    reset();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <KeyboardAvoidingView style={styles.modalContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{mode ? 'Plan details' : 'What do you need?'}</Text>
          <Pressable onPress={close}>
            <Ionicons name="close" size={24} color={C.text} />
          </Pressable>
        </View>

        <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: SPACING.md }}>
          {!mode ? (
            <>
              <ModeCard
                theme={theme}
                icon="today-outline"
                title="Full day plan"
                sub="Meals for the whole day, split how you like"
                onPress={() => setMode('FULL_DAY')}
              />
              <ModeCard
                theme={theme}
                icon="restaurant-outline"
                title="Just this meal"
                sub="One meal for right now, hit a protein target"
                onPress={() => setMode('SINGLE_MEAL')}
              />
            </>
          ) : (
            <>
              <View>
                <Text style={styles.inputLabel}>Target calories (optional)</Text>
                <TextInput
                  style={styles.mealInput}
                  placeholder={mode === 'FULL_DAY' ? 'e.g. 2000 for the day' : 'e.g. 600 for this meal'}
                  placeholderTextColor={C.textMuted}
                  keyboardType="number-pad"
                  value={calories}
                  onChangeText={setCalories}
                />
                <Text style={styles.inputHint}>Leave blank and the coach estimates from your profile.</Text>
              </View>

              {mode === 'FULL_DAY' ? (
                <View>
                  <Text style={styles.inputLabel}>Split into how many meals?</Text>
                  <View style={styles.segmentRow}>
                    {[3, 4, 5, 6].map((n) => (
                      <Pressable
                        key={n}
                        style={[
                          styles.segment,
                          mealCount === n && { backgroundColor: theme.primary, borderColor: theme.primary },
                        ]}
                        onPress={() => setMealCount(n)}
                      >
                        <Text style={[styles.segmentText, mealCount === n && { color: '#000' }]}>{n}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : (
                <View>
                  <Text style={styles.inputLabel}>Target protein (optional)</Text>
                  <TextInput
                    style={styles.mealInput}
                    placeholder="e.g. 40 g"
                    placeholderTextColor={C.textMuted}
                    keyboardType="number-pad"
                    value={protein}
                    onChangeText={setProtein}
                  />
                </View>
              )}

              <Pressable style={[styles.generateBtn, styles.mealGenerateBtn, { backgroundColor: theme.primary }]} onPress={submit}>
                <Ionicons name="flash-outline" size={16} color="#000" />
                <Text style={styles.generateBtnText}>Generate Plan</Text>
              </Pressable>

              <Pressable style={styles.retakeBtn} onPress={() => setMode(null)}>
                <Ionicons name="arrow-back" size={15} color={C.textMuted} />
                <Text style={styles.retakeBtnText}>Back</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ModeCard({
  theme,
  icon,
  title,
  sub,
  onPress,
}: {
  theme: ReturnType<typeof useTheme>['theme'];
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  sub: string;
  onPress: () => void;
}) {
  const C = theme.colors;
  const styles = useMemo(() => makeStyles(C), [C]);
  return (
    <Pressable style={[styles.modeCard, { borderColor: theme.primary + '30' }]} onPress={onPress}>
      <View style={[styles.iconCircle, { backgroundColor: theme.primary + '18', width: 48, height: 48, borderRadius: 24, marginBottom: 0 }]}>
        <Ionicons name={icon} size={24} color={theme.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.modeCardTitle}>{title}</Text>
        <Text style={styles.modeCardSub}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={C.textMuted} />
    </Pressable>
  );
}

// ─── Meal Plan: structured renderer ───────────────────────────────────────────

function MealPlanView({
  plan,
  generatedAt,
  theme,
}: {
  plan: MealPlan;
  generatedAt: string | null;
  theme: ReturnType<typeof useTheme>['theme'];
}) {
  const C = theme.colors;
  const styles = useMemo(() => makeStyles(C), [C]);
  const dateLabel = generatedAt
    ? new Date(generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;

  return (
    <>
      {/* Summary header */}
      <View style={[styles.planHeader, { backgroundColor: theme.primary + '18', borderColor: theme.primary + '30' }]}>
        <View style={styles.planHeaderRow}>
          <Ionicons name="nutrition-outline" size={20} color={theme.primary} />
          <Text style={[styles.planFocus, { color: theme.primary }]}>{plan.title}</Text>
        </View>
        <View style={styles.planMeta}>
          <View style={styles.planMetaItem}>
            <Ionicons name="flame-outline" size={13} color={C.textSecondary} />
            <Text style={styles.planMetaText}>{plan.totalCalories} kcal</Text>
          </View>
          <View style={styles.planMetaItem}>
            <Ionicons name="barbell-outline" size={13} color={C.textSecondary} />
            <Text style={styles.planMetaText}>{plan.totalProteinG}g protein</Text>
          </View>
          {dateLabel && (
            <View style={styles.planMetaItem}>
              <Ionicons name="calendar-outline" size={13} color={C.textSecondary} />
              <Text style={styles.planMetaText}>{dateLabel}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Meal cards */}
      {plan.meals.map((meal, i) => (
        <View key={i} style={styles.mealCard}>
          <View style={styles.mealCardHeader}>
            <Text style={styles.mealCardName}>{meal.name}</Text>
            <Text style={[styles.mealCardCals, { color: theme.primary }]}>{meal.calories} kcal</Text>
          </View>
          <View style={styles.macroRow}>
            <MacroChip label="Protein" value={`${meal.proteinG}`} unit="g" theme={theme} />
            <MacroChip label="Carbs" value={`${meal.carbsG}`} unit="g" theme={theme} />
            <MacroChip label="Fat" value={`${meal.fatG}`} unit="g" theme={theme} />
          </View>
          <View style={styles.mealItems}>
            {meal.items.map((item, j) => (
              <View key={j} style={styles.mealItemRow}>
                <View style={[styles.mealItemDot, { backgroundColor: theme.primary }]} />
                <Text style={styles.mealItemText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}

      {/* Tips */}
      {plan.tips.length > 0 && (
        <View style={styles.suggestionCard}>
          <View style={styles.suggestionCardHeader}>
            <Ionicons name="bulb-outline" size={16} color={theme.primary} />
            <Text style={[styles.suggestionCardLabel, { color: theme.primary }]}>Tips</Text>
          </View>
          {plan.tips.map((tip, i) => (
            <View key={i} style={styles.mistakeRow}>
              <Ionicons name="checkmark-circle-outline" size={16} color={theme.primary} />
              <Text style={styles.mistakeText}>{tip}</Text>
            </View>
          ))}
        </View>
      )}
    </>
  );
}

// ─── Food Diary Tab ───────────────────────────────────────────────────────────

function DiaryTab({ gymId, memberId, theme }: TabProps) {
  const C = theme.colors;
  const styles = useMemo(() => makeStyles(C), [C]);
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const refresh = useCallback(async () => {
    if (!gymId || !memberId) return;
    setLoading(true);
    try {
      const data = await aiService.listFoodLogs(gymId, memberId);
      setLogs(data);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, [gymId, memberId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onLogged = (log: FoodLog) => {
    setLogs((prev) => [log, ...prev]);
    setShowModal(false);
  };

  return (
    <View style={styles.tabContent}>
      <View style={styles.diaryHeader}>
        <Text style={styles.diaryTitle}>Today's Food Log</Text>
        <Pressable
          style={[styles.logBtn, { backgroundColor: theme.primary }]}
          onPress={() => setShowModal(true)}
          disabled={!memberId}
        >
          <Ionicons name="add" size={18} color="#000" />
          <Text style={styles.logBtnText}>Log Meal</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={{ marginTop: SPACING.xl, alignItems: 'center' }}>
          <AppLoader />
        </View>
      ) : logs.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="fast-food-outline" size={48} color={C.textMuted} />
          <Text style={styles.emptyText}>No meals logged yet</Text>
          <Text style={styles.emptySub}>Tap "Log Meal" to track what you eat</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: SPACING.md }}>
          {logs.map((log) => (
            <FoodLogRow key={log.id} log={log} theme={theme} />
          ))}
        </ScrollView>
      )}

      <LogMealModal
        visible={showModal}
        gymId={gymId}
        memberId={memberId}
        theme={theme}
        onClose={() => setShowModal(false)}
        onLogged={onLogged}
      />
    </View>
  );
}

// ─── Log Meal Modal ───────────────────────────────────────────────────────────

type ModalStep = 'photo' | 'uploading' | 'analysing' | 'result';

function LogMealModal({
  visible,
  gymId,
  memberId,
  theme,
  onClose,
  onLogged,
}: {
  visible: boolean;
  gymId: string;
  memberId: string | null;
  theme: ReturnType<typeof useTheme>['theme'];
  onClose: () => void;
  onLogged: (log: FoodLog) => void;
}) {
  const C = theme.colors;
  const styles = useMemo(() => makeStyles(C), [C]);
  const [step, setStep] = useState<ModalStep>('photo');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<MealAnalysis | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setStep('photo');
    setPhotoUri(null);
    setAnalysis(null);
    setNote('');
    setError(null);
    setSaving(false);
  };

  const handleClose = () => { reset(); onClose(); };

  // ── Pick photo ────────────────────────────────────────────────────────────

  const pickPhoto = async (source: 'camera' | 'gallery') => {
    try {
      let result: ImagePicker.ImagePickerResult;
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Permission required', 'Camera access is needed to take a photo.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: 'images',
          quality: 0.8,
          allowsEditing: true,
          aspect: [4, 3],
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: 'images',
          quality: 0.8,
          allowsEditing: true,
          aspect: [4, 3],
        });
      }

      if (result.canceled || !result.assets[0]) return;
      const uri = result.assets[0].uri;
      setPhotoUri(uri);
      await uploadAndAnalyse(uri);
    } catch {
      setError('Could not access photo. Please try again.');
    }
  };

  // ── Upload + analyse ──────────────────────────────────────────────────────

  const uploadAndAnalyse = async (uri: string) => {
    if (!gymId || !memberId) return;
    setError(null);

    try {
      setStep('uploading');
      const { url } = await aiService.uploadFoodPhoto(gymId, memberId, uri);

      setStep('analysing');
      const result = await aiService.analyseMeal(gymId, memberId, { photoUrl: url });
      setAnalysis(result);
      setStep('result');
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message ?? 'Could not analyse the photo. Please try again.');
      setStep('photo');
    }
  };

  // ── Save to diary ─────────────────────────────────────────────────────────

  const save = async () => {
    if (!gymId || !memberId || !analysis) return;
    setSaving(true);
    try {
      const log = await aiService.logFood(gymId, memberId, {
        description: note.trim() || analysis.description,
        // The API takes whole calories and macros with at most one decimal.
        calories: Math.round(analysis.calories),
        proteinG: Math.round(analysis.proteinG * 10) / 10,
        carbsG: Math.round(analysis.carbsG * 10) / 10,
        fatG: Math.round(analysis.fatG * 10) / 10,
      });
      onLogged(log);
      reset();
    } catch (err) {
      Alert.alert('Error', formatApiError(err, 'Could not save the meal log.'));
    } finally {
      setSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const isLoading = step === 'uploading' || step === 'analysing';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Log a Meal</Text>
          <Pressable onPress={handleClose} disabled={isLoading}>
            <Ionicons name="close" size={24} color={C.text} />
          </Pressable>
        </View>

        <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: SPACING.md }}>

          {/* ── Step: pick photo ── */}
          {step === 'photo' && (
            <>
              <View style={[styles.photoPlaceholder, { borderColor: theme.primary + '60' }]}>
                <Ionicons name="camera-outline" size={48} color={C.textMuted} />
                <Text style={styles.photoPlaceholderText}>Take or choose a photo of your meal</Text>
              </View>

              {error && (
                <View style={styles.errorBox}>
                  <Ionicons name="warning-outline" size={15} color={C.error} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.photoBtn, { backgroundColor: theme.primary }]}
                onPress={() => pickPhoto('camera')}
                activeOpacity={0.8}
              >
                <Ionicons name="camera" size={18} color="#000" />
                <Text style={styles.photoBtnText}>Take Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.photoBtn, styles.photoBtnSecondary]}
                onPress={() => pickPhoto('gallery')}
                activeOpacity={0.8}
              >
                <Ionicons name="images-outline" size={18} color={C.text} />
                <Text style={[styles.photoBtnText, { color: C.text }]}>Choose from Gallery</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ── Step: loading ── */}
          {isLoading && (
            <View style={styles.loadingState}>
              {photoUri && (
                <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
              )}
              <View style={{ marginTop: SPACING.lg }}><AppLoader /></View>
              <Text style={styles.loadingText}>
                {step === 'uploading' ? 'Uploading photo…' : 'Analysing your meal…'}
              </Text>
            </View>
          )}

          {/* ── Step: result ── */}
          {step === 'result' && analysis && (
            <>
              {photoUri && (
                <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
              )}

              <View style={[styles.analysisCard, { borderColor: theme.primary + '40' }]}>
                <View style={styles.analysisHeader}>
                  <Ionicons name="sparkles" size={14} color={theme.primary} />
                  <Text style={[styles.analysisTitle, { color: theme.primary }]}>AI Analysis</Text>
                </View>
                <Text style={styles.analysisDesc}>{analysis.description}</Text>
                <View style={styles.macroRow}>
                  <MacroChip label="Calories" value={`${analysis.calories}`} unit="kcal" theme={theme} />
                  <MacroChip label="Protein" value={`${analysis.proteinG}`} unit="g" theme={theme} />
                  <MacroChip label="Carbs" value={`${analysis.carbsG}`} unit="g" theme={theme} />
                  <MacroChip label="Fat" value={`${analysis.fatG}`} unit="g" theme={theme} />
                </View>
                {analysis.notes ? (
                  <Text style={styles.analysisNotes}>{analysis.notes}</Text>
                ) : null}
              </View>

              <View>
                <Text style={styles.inputLabel}>Add a note (optional)</Text>
                <TextInput
                  style={styles.textArea}
                  placeholder="e.g. Large portion, homemade…"
                  placeholderTextColor={C.textMuted}
                  value={note}
                  onChangeText={setNote}
                  multiline
                  numberOfLines={2}
                />
              </View>

              <Pressable
                style={[styles.saveBtn, { backgroundColor: theme.primary }, saving && styles.saveBtnDisabled]}
                onPress={save}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Save to Diary</Text>
                )}
              </Pressable>

              <Pressable style={styles.retakeBtn} onPress={reset}>
                <Ionicons name="camera-outline" size={15} color={C.textMuted} />
                <Text style={styles.retakeBtnText}>Retake Photo</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Shared Components ────────────────────────────────────────────────────────

function SuggestionCard({
  text,
  icon,
  theme,
  generatedAt,
}: {
  text: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  theme: ReturnType<typeof useTheme>['theme'];
  generatedAt?: string | null;
}) {
  const C = theme.colors;
  const styles = useMemo(() => makeStyles(C), [C]);
  const dateLabel = generatedAt
    ? new Date(generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;
  return (
    <View style={styles.suggestionCard}>
      <View style={styles.suggestionCardHeader}>
        <Ionicons name={icon} size={16} color={theme.primary} />
        <Text style={[styles.suggestionCardLabel, { color: theme.primary }]}>AI Response</Text>
        {dateLabel && <Text style={styles.suggestionCardDate}>Generated {dateLabel}</Text>}
      </View>
      <Text style={styles.suggestionText}>{text}</Text>
    </View>
  );
}

function FoodLogRow({ log, theme }: { log: FoodLog; theme: ReturnType<typeof useTheme>['theme'] }) {
  const C = theme.colors;
  const styles = useMemo(() => makeStyles(C), [C]);
  const time = new Date(log.loggedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  return (
    <View style={styles.logRow}>
      <View style={[styles.logIcon, { backgroundColor: theme.primary + '18' }]}>
        <Ionicons name="fast-food-outline" size={18} color={theme.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.logDesc}>{log.description}</Text>
        <Text style={styles.logMeta}>
          {log.calories ? `${log.calories} kcal · ` : ''}{time}
        </Text>
      </View>
    </View>
  );
}

function MacroChip({
  label,
  value,
  unit,
  theme,
}: {
  label: string;
  value: string;
  unit?: string;
  theme: ReturnType<typeof useTheme>['theme'];
}) {
  const C = theme.colors;
  const styles = useMemo(() => makeStyles(C), [C]);
  return (
    <View style={[styles.macroChip, { backgroundColor: theme.primary + '12' }]}>
      <Text style={[styles.macroValue, { color: theme.primary }]}>
        {value}{unit ? <Text style={styles.macroUnit}> {unit}</Text> : null}
      </Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface TabProps {
  gymId: string;
  memberId: string | null;
  theme: ReturnType<typeof useTheme>['theme'];
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (C: ColorPalette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl + SPACING.lg,
    paddingBottom: SPACING.md,
  },
  headerTitle: {
    fontSize: 20,
    ...FONT.bold,
    color: '#000',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {},
  tabText: {
    fontSize: 13,
    ...FONT.medium,
    color: C.textMuted,
  },
  tabTextActive: {
    ...FONT.semibold,
  },
  tabContent: {
    flex: 1,
  },
  tabContentInner: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  heroCard: {
    backgroundColor: C.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: C.border,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  heroTitle: {
    fontSize: 18,
    ...FONT.bold,
    color: C.text,
  },
  heroSub: {
    fontSize: 13,
    color: C.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.full,
    marginTop: SPACING.sm,
  },
  generateBtnDisabled: {
    opacity: 0.6,
  },
  generateBtnText: {
    fontSize: 14,
    ...FONT.semibold,
    color: '#000',
  },
  suggestionCard: {
    backgroundColor: C.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: C.border,
  },
  suggestionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  suggestionCardLabel: {
    fontSize: 12,
    ...FONT.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  suggestionCardDate: {
    marginLeft: 'auto',
    fontSize: 11,
    color: C.textMuted,
    ...FONT.regular,
  },
  suggestionText: {
    fontSize: 14,
    color: C.text,
    lineHeight: 22,
  },
  // Diary tab
  diaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  diaryTitle: {
    fontSize: 16,
    ...FONT.semibold,
    color: C.text,
  },
  logBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.full,
  },
  logBtnText: {
    fontSize: 13,
    ...FONT.semibold,
    color: '#000',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.xl * 2,
  },
  emptyText: {
    fontSize: 16,
    ...FONT.semibold,
    color: C.textSecondary,
  },
  emptySub: {
    fontSize: 13,
    color: C.textMuted,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    backgroundColor: C.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: C.border,
  },
  logIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logDesc: {
    fontSize: 14,
    ...FONT.medium,
    color: C.text,
    marginBottom: 3,
  },
  logMeta: {
    fontSize: 12,
    color: C.textMuted,
  },
  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: C.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalTitle: {
    fontSize: 18,
    ...FONT.bold,
    color: C.text,
  },
  modalBody: {
    flex: 1,
    padding: SPACING.lg,
  },
  inputLabel: {
    fontSize: 14,
    ...FONT.semibold,
    color: C.text,
    marginBottom: SPACING.sm,
  },
  textArea: {
    backgroundColor: C.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: C.border,
    padding: SPACING.md,
    fontSize: 14,
    color: C.text,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: SPACING.md,
  },
  analyseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    borderWidth: 1.5,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.md,
  },
  analyseBtnDisabled: {
    opacity: 0.5,
  },
  analyseBtnText: {
    fontSize: 14,
    ...FONT.semibold,
  },
  analysisCard: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  analysisTitle: {
    fontSize: 12,
    ...FONT.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: SPACING.sm,
  },
  macroRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    flexWrap: 'wrap',
    marginBottom: SPACING.sm,
  },
  macroChip: {
    borderRadius: RADIUS.sm,
    paddingVertical: 6,
    paddingHorizontal: SPACING.sm,
    alignItems: 'center',
    minWidth: 70,
  },
  macroValue: {
    fontSize: 14,
    ...FONT.bold,
  },
  macroLabel: {
    fontSize: 11,
    color: C.textMuted,
    marginTop: 2,
  },
  analysisNotes: {
    fontSize: 12,
    color: C.textSecondary,
    fontStyle: 'italic',
  },
  saveBtn: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    fontSize: 15,
    ...FONT.semibold,
    color: '#000',
  },

  // Photo modal
  photoPlaceholder: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
    gap: SPACING.sm,
  },
  photoPlaceholderText: {
    fontSize: 13,
    color: C.textMuted,
    textAlign: 'center',
    ...FONT.regular,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: C.errorBg,
    borderWidth: 1,
    borderColor: C.error,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: C.error,
    ...FONT.regular,
  },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: 14,
    borderRadius: RADIUS.button,
  },
  photoBtnSecondary: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  photoBtnText: {
    fontSize: 15,
    color: '#000',
    ...FONT.semibold,
  },
  photoPreview: {
    width: '100%',
    height: 220,
    borderRadius: RADIUS.lg,
    backgroundColor: C.border,
  },
  loadingState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    gap: SPACING.sm,
  },
  loadingText: {
    fontSize: 14,
    color: C.textSecondary,
    ...FONT.regular,
    marginTop: SPACING.sm,
  },
  analysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  analysisDesc: {
    fontSize: 13,
    color: C.textSecondary,
    ...FONT.regular,
    marginBottom: SPACING.sm,
  },
  macroUnit: {
    fontSize: 10,
    color: C.textMuted,
    ...FONT.regular,
  },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
  },
  retakeBtnText: {
    fontSize: 13,
    color: C.textMuted,
    ...FONT.regular,
  },
  // Exercise card tap hint
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  cardTapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  cardTapHintText: {
    fontSize: 10,
    color: C.textMuted,
    ...FONT.regular,
  },
  swapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 62,
    height: 26,
    paddingHorizontal: 8,
    borderRadius: RADIUS.full,
  },
  swapBtnText: {
    fontSize: 11,
    ...FONT.semibold,
  },
  swapCurrentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  swapCurrentName: {
    flex: 1,
    fontSize: 15,
    ...FONT.semibold,
    color: C.text,
  },
  swapChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  swapChip: {
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
  },
  swapChipText: {
    fontSize: 13,
    ...FONT.medium,
  },
  // Exercise detail modal
  exModalContainer: {
    flex: 1,
    backgroundColor: C.background,
  },
  exModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: SPACING.sm,
  },
  exModalTitle: {
    fontSize: 20,
    ...FONT.bold,
    color: C.text,
  },
  exModalStats: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  exModalStat: {
    fontSize: 13,
    ...FONT.medium,
    color: C.textSecondary,
  },
  exModalClose: {
    padding: 4,
    marginTop: 2,
  },
  exModalLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
  },
  exModalLoadingText: {
    fontSize: 14,
    color: C.textMuted,
    ...FONT.regular,
  },
  exModalBody: {
    padding: SPACING.lg,
    gap: SPACING.lg,
    paddingBottom: 40,
  },
  exModalGif: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: C.surface,
  },
  exSection: {
    gap: SPACING.sm,
  },
  exSectionLabel: {
    fontSize: 11,
    ...FONT.semibold,
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  muscleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  musclePill: {
    paddingVertical: 4,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  musclePillText: {
    fontSize: 13,
    ...FONT.semibold,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  stepNumText: {
    fontSize: 11,
    ...FONT.bold,
    color: '#000',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: C.text,
    ...FONT.regular,
    lineHeight: 22,
  },
  mistakeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  mistakeText: {
    flex: 1,
    fontSize: 14,
    color: C.textSecondary,
    ...FONT.regular,
    lineHeight: 20,
  },
  modCard: {
    backgroundColor: C.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: C.border,
    padding: SPACING.md,
  },
  modRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  modLabel: {
    fontSize: 11,
    ...FONT.semibold,
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  modText: {
    fontSize: 13,
    color: C.text,
    ...FONT.regular,
    lineHeight: 19,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: C.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: C.border,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  tipCardText: {
    flex: 1,
    fontSize: 13,
    color: C.textSecondary,
    ...FONT.regular,
    lineHeight: 19,
  },
  planDate: {
    fontSize: 12,
    color: C.textMuted,
    ...FONT.regular,
    textAlign: 'center',
    marginTop: -SPACING.xs,
  },
  // Day selector
  dayPillRow: {
    gap: SPACING.sm,
    paddingVertical: 2,
  },
  dayPill: {
    paddingVertical: 6,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    alignItems: 'center',
    gap: 3,
  },
  dayPillText: {
    fontSize: 13,
    ...FONT.semibold,
    color: C.textSecondary,
  },
  dayPillTextActive: {
    color: '#000',
  },
  todayDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  // Workout plan cards
  workoutEmpty: {
    backgroundColor: C.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: C.border,
  },
  planHeader: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  planHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  planFocus: {
    fontSize: 17,
    ...FONT.bold,
  },
  planMeta: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: 2,
  },
  planMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  planMetaText: {
    fontSize: 12,
    color: C.textSecondary,
    ...FONT.regular,
  },
  sectionBlock: {
    gap: SPACING.sm,
  },
  sectionTitle: {
    fontSize: 13,
    ...FONT.semibold,
    color: C.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: 2,
  },
  exerciseRow: {
    gap: SPACING.sm,
    paddingBottom: 4,
  },
  exerciseCard: {
    width: 200,
    backgroundColor: C.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  exerciseName: {
    fontSize: 14,
    ...FONT.bold,
    color: C.text,
    lineHeight: 20,
  },
  exerciseStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: C.border,
    borderRadius: RADIUS.full,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  statValue: {
    fontSize: 12,
    ...FONT.bold,
  },
  statLabel: {
    fontSize: 11,
    color: C.textMuted,
    ...FONT.regular,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    marginTop: 2,
  },
  tipText: {
    flex: 1,
    fontSize: 11,
    color: C.textMuted,
    ...FONT.regular,
    lineHeight: 16,
  },
  // Meal plan (Phase 2)
  mealLoading: {
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.xl,
  },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: C.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
  },
  modeCardTitle: {
    fontSize: 15,
    ...FONT.bold,
    color: C.text,
  },
  modeCardSub: {
    fontSize: 12,
    color: C.textSecondary,
    ...FONT.regular,
    lineHeight: 17,
    marginTop: 2,
  },
  mealInput: {
    backgroundColor: C.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: C.border,
    padding: SPACING.md,
    fontSize: 15,
    color: C.text,
  },
  inputHint: {
    fontSize: 11,
    color: C.textMuted,
    ...FONT.regular,
    marginTop: SPACING.xs,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  segmentText: {
    fontSize: 15,
    ...FONT.semibold,
    color: C.textSecondary,
  },
  mealGenerateBtn: {
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    marginTop: SPACING.sm,
  },
  mealCard: {
    backgroundColor: C.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: C.border,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  mealCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mealCardName: {
    fontSize: 15,
    ...FONT.bold,
    color: C.text,
  },
  mealCardCals: {
    fontSize: 13,
    ...FONT.semibold,
  },
  mealItems: {
    gap: SPACING.xs,
    marginTop: 2,
  },
  mealItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  mealItemDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 7,
  },
  mealItemText: {
    flex: 1,
    fontSize: 13,
    color: C.text,
    ...FONT.regular,
    lineHeight: 19,
  },

  // ── Workout plan wizard ──
  wizardProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  wizardDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: C.border,
  },
  wizardDotActive: {
    width: 22,
  },
  wizardBody: {
    flex: 1,
  },
  wizardQuestion: {
    padding: SPACING.lg,
    paddingTop: SPACING.md,
    gap: SPACING.sm,
  },
  wizardQTitle: {
    fontSize: 22,
    ...FONT.bold,
    color: C.text,
  },
  wizardQSub: {
    fontSize: 14,
    color: C.textSecondary,
    ...FONT.regular,
    marginBottom: SPACING.sm,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  optionIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTitle: {
    fontSize: 15,
    ...FONT.semibold,
    color: C.text,
  },
  optionSub: {
    fontSize: 12,
    color: C.textMuted,
    ...FONT.regular,
    marginTop: 1,
  },
  reviewCard: {
    backgroundColor: C.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: C.border,
    padding: SPACING.md,
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: 4,
  },
  reviewLabel: {
    fontSize: 13,
    color: C.textSecondary,
    ...FONT.regular,
  },
  reviewValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 14,
    ...FONT.semibold,
    color: C.text,
  },
});
