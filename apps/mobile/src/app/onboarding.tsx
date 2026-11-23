import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Text } from '../components/Text';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useMyMember, useMyProfile, useUpdateMyProfile } from '../hooks/members';
import { useFitnessPlanOptions, useSaveFitnessPlan } from '../hooks/fitness-plan';
import { CoachMessage } from '../components/onboarding/CoachMessage';
import { WelcomeStage } from '../components/onboarding/WelcomeStage';
import {
  NumberField,
  Notice,
  OptionList,
  PrimaryButton,
  SegmentedToggle,
  TextButton,
  type Option,
} from '../components/onboarding/controls';
import { PaceCards } from '../components/onboarding/PaceCards';
import { TargetsReveal } from '../components/onboarding/TargetsReveal';
import { formatGoalDate } from '../components/onboarding/format';
import { useInstantContent, useReduceMotion, useScreenReader } from '../components/onboarding/use-reduce-motion';
import { cmToFeetInches, feetInchesToCm, kgToLb, lbToKg, toNumber } from '../lib/units';
import { formatApiError } from '../lib/format-error';
import {
  ActivityLevel,
  DietType,
  ExperienceLevel,
  FitnessDirection,
  FitnessGoal,
  Sex,
  UnitSystem,
} from '../constants/enums';
import type { ApiErrorFields } from '../services/api';
import type { DailyTargets } from '../types';

// Same limits as the API (PROFILE_LIMITS); checked here only to give instant feedback.
const LIMITS = { age: [13, 100], heightCm: [120, 230], weightKg: [30, 300] } as const;

const STEPS = [
  'welcome',
  'consent',
  'goal',
  'sex',
  'body',
  'target',
  'activity',
  'training',
  'diet',
  'plan',
  'reveal',
] as const;
type Step = (typeof STEPS)[number];

const GOAL_OPTIONS: Option<FitnessGoal>[] = [
  { value: FitnessGoal.LOSE_WEIGHT, label: 'Lose fat', description: 'Drop weight and get leaner', icon: 'trending-down' },
  { value: FitnessGoal.BUILD_MUSCLE, label: 'Build muscle', description: 'Gain size and strength', icon: 'barbell' },
  { value: FitnessGoal.GET_FIT, label: 'Get fit', description: 'More energy, better conditioning', icon: 'flash' },
  { value: FitnessGoal.STAY_HEALTHY, label: 'Stay healthy', description: 'Keep my weight and build habits', icon: 'heart' },
];

const SEX_OPTIONS: Option<Sex>[] = [
  { value: Sex.MALE, label: 'Male', icon: 'male' },
  { value: Sex.FEMALE, label: 'Female', icon: 'female' },
  { value: Sex.UNSPECIFIED, label: 'Prefer not to say', description: 'We use an average', icon: 'remove-circle-outline' },
];

const ACTIVITY_OPTIONS: Option<ActivityLevel>[] = [
  { value: ActivityLevel.SEDENTARY, label: 'Mostly sitting', description: 'Desk job, little walking', icon: 'desktop-outline' },
  { value: ActivityLevel.LIGHT, label: 'Lightly active', description: '1–3 light workouts, or on my feet part of the day', icon: 'walk-outline' },
  { value: ActivityLevel.MODERATE, label: 'Moderately active', description: '3–5 workouts, e.g. weights or 30–45 min cardio', icon: 'bicycle-outline' },
  { value: ActivityLevel.VERY_ACTIVE, label: 'Very active', description: '6–7 hard sessions, or a physical job', icon: 'flame-outline' },
  { value: ActivityLevel.ATHLETE, label: 'Athlete', description: 'Training twice a day', icon: 'trophy-outline' },
];

const EXPERIENCE_OPTIONS: Option<ExperienceLevel>[] = [
  { value: ExperienceLevel.BEGINNER, label: 'Beginner', description: 'Under 1 year of training', icon: 'leaf-outline' },
  { value: ExperienceLevel.INTERMEDIATE, label: 'Intermediate', description: '1–3 years', icon: 'barbell-outline' },
  { value: ExperienceLevel.ADVANCED, label: 'Advanced', description: '3+ years', icon: 'medal-outline' },
];

const DAYS_OPTIONS: Option<number>[] = [1, 2, 3, 4, 5, 6, 7].map((d) => ({
  value: d,
  label: `${d}×`,
}));

const DIET_OPTIONS: Option<DietType>[] = [
  { value: DietType.NONE, label: 'No restrictions' },
  { value: DietType.VEGETARIAN, label: 'Vegetarian' },
  { value: DietType.VEGAN, label: 'Vegan' },
  { value: DietType.HALAL, label: 'Halal' },
  { value: DietType.GLUTEN_FREE, label: 'Gluten-free' },
];

// API error code → the step where the member can fix it.
const ERROR_STEP: Record<string, Step> = {
  PROFILE_INCOMPLETE: 'body',
  PROFILE_OUT_OF_RANGE: 'body',
  TARGET_WEIGHT_REQUIRED: 'target',
  TARGET_CONFLICTS_WITH_GOAL: 'target',
  TARGET_BELOW_HEALTHY_RANGE: 'target',
  LOSS_NOT_RECOMMENDED: 'goal',
  HEALTH_DATA_CONSENT_REQUIRED: 'consent',
};

function inRange(value: number | null, [min, max]: readonly [number, number]): boolean {
  return value !== null && value >= min && value <= max;
}

export default function OnboardingScreen() {
  const { user, gymInfo } = useAuth();
  const { theme } = useTheme();
  const colors = theme.colors;
  const reduceMotion = useReduceMotion();
  const instant = useInstantContent();
  const screenReader = useScreenReader();
  const existing = useMyProfile().data;
  const member = useMyMember().data;
  const updateProfile = useUpdateMyProfile();
  const savePlan = useSaveFitnessPlan();

  const [step, setStep] = useState<Step>('welcome');
  const [typed, setTyped] = useState(false);

  // Answers. Weight and height are kept as typed, in the chosen unit, and converted on save.
  const [goal, setGoal] = useState<FitnessGoal | null>((existing?.fitnessGoal as FitnessGoal) ?? null);
  const [sex, setSex] = useState<Sex | null>((existing?.sex as Sex) ?? null);
  // Saved values are metric; show them in the member's saved unit.
  const startImperial = existing?.unitSystem === UnitSystem.IMPERIAL;
  const savedCm = toNumber(existing?.heightCm);
  const savedFtIn = savedCm !== null ? cmToFeetInches(savedCm) : null;
  const displayWeight = (kg: number | null) =>
    kg === null ? '' : String(startImperial ? Math.round(kgToLb(kg) * 10) / 10 : kg);
  const [units, setUnits] = useState<UnitSystem>(startImperial ? UnitSystem.IMPERIAL : UnitSystem.METRIC);
  const [age, setAge] = useState(existing?.age ? String(existing.age) : '');
  const [heightCm, setHeightCm] = useState(savedCm !== null ? String(savedCm) : '');
  const [heightFt, setHeightFt] = useState(savedFtIn ? String(savedFtIn.feet) : '');
  const [heightIn, setHeightIn] = useState(savedFtIn ? String(savedFtIn.inches) : '');
  const [weight, setWeight] = useState(() => displayWeight(toNumber(existing?.weightKg)));
  const [target, setTarget] = useState(() => displayWeight(toNumber(existing?.targetWeightKg)));
  const [activity, setActivity] = useState<ActivityLevel | null>((existing?.activityLevel as ActivityLevel) ?? null);
  const [days, setDays] = useState<number | null>(existing?.daysPerWeek ?? null);
  const [experience, setExperience] = useState<ExperienceLevel | null>(
    (existing?.experienceLevel as ExperienceLevel) ?? null,
  );
  const [diet, setDiet] = useState<DietType>((existing?.dietType as DietType) ?? DietType.NONE);
  const [injuries, setInjuries] = useState(existing?.injuries ?? '');
  const [healthCaution, setHealthCaution] = useState(existing?.healthCaution ?? false);
  const [pace, setPace] = useState<string | null>(null);
  const [planReady, setPlanReady] = useState(false);
  const [savedTargets, setSavedTargets] = useState<{ targets: DailyTargets; targetDate: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const imperial = units === UnitSystem.IMPERIAL;
  const weightUnit = imperial ? 'lb' : 'kg';
  // A restored session's token has no name, so fall back to the member record.
  const fullName = user?.fullName || member?.user.fullName || '';
  const firstName = fullName.split(' ')[0] || 'there';
  const gymName = gymInfo?.gymName || 'the gym';

  const options = useFitnessPlanOptions(planReady);

  // ── Derived metric values ────────────────────────────────────────────────────
  const toKg = useCallback(
    (text: string) => {
      const n = toNumber(text);
      if (n === null) return null;
      return imperial ? lbToKg(n) : Math.round(n * 100) / 100;
    },
    [imperial],
  );
  const ageN = toNumber(age);
  const heightCmN = imperial
    ? toNumber(heightFt) !== null
      ? feetInchesToCm(toNumber(heightFt) ?? 0, toNumber(heightIn) ?? 0)
      : null
    : toNumber(heightCm);
  const weightKg = toKg(weight);
  const targetKg = toKg(target);

  const bodyErrors = {
    age: age && !inRange(ageN, LIMITS.age) ? `Enter an age between ${LIMITS.age[0]} and ${LIMITS.age[1]}` : null,
    height:
      (imperial ? heightFt : heightCm) && !inRange(heightCmN, LIMITS.heightCm)
        ? imperial
          ? 'Enter a height between 3 ft 11 in and 7 ft 6 in'
          : `Enter a height between ${LIMITS.heightCm[0]} and ${LIMITS.heightCm[1]} cm`
        : null,
    weight: weight && !inRange(weightKg, LIMITS.weightKg) ? `That weight looks off — check the ${weightUnit} value` : null,
  };
  const bodyValid =
    inRange(ageN, LIMITS.age) && inRange(heightCmN, LIMITS.heightCm) && inRange(weightKg, LIMITS.weightKg);

  const targetRequired = goal === FitnessGoal.LOSE_WEIGHT || goal === FitnessGoal.BUILD_MUSCLE;
  const targetError = useMemo(() => {
    if (!target) return null;
    if (!inRange(targetKg, LIMITS.weightKg) || weightKg === null || targetKg === null) return 'Check this value';
    if (goal === FitnessGoal.LOSE_WEIGHT && targetKg >= weightKg) return 'To lose fat, aim below your current weight';
    if (goal === FitnessGoal.BUILD_MUSCLE && targetKg <= weightKg) return 'To build muscle, aim above your current weight';
    return null;
  }, [target, targetKg, weightKg, goal]);

  // ── Unit switching keeps the numbers the member already typed ────────────────
  function switchUnits(next: UnitSystem) {
    if (next === units) return;
    const convertWeight = (text: string) => {
      const n = toNumber(text);
      if (n === null) return text;
      return next === UnitSystem.IMPERIAL ? String(Math.round(kgToLb(n) * 10) / 10) : String(lbToKg(n));
    };
    setWeight(convertWeight(weight));
    setTarget(convertWeight(target));
    if (next === UnitSystem.IMPERIAL) {
      const cm = toNumber(heightCm);
      if (cm !== null) {
        const { feet, inches } = cmToFeetInches(cm);
        setHeightFt(String(feet));
        setHeightIn(String(inches));
      }
    } else if (heightCmN !== null) {
      setHeightCm(String(heightCmN));
    }
    setUnits(next);
  }

  // ── Navigation ───────────────────────────────────────────────────────────────
  const fade = useRef(new Animated.Value(1)).current;
  function goTo(next: Step) {
    setError(null);
    const swap = () => {
      setTyped(false);
      setStep(next);
    };
    if (reduceMotion) return swap();
    Animated.timing(fade, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
      swap();
      Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    });
  }
  const index = STEPS.indexOf(step);
  const next = () => goTo(STEPS[index + 1]);
  const back = () => {
    if (step === 'reveal') return;
    if (step === 'plan') setPlanReady(false);
    goTo(STEPS[Math.max(0, index - 1)]);
  };

  async function skipForNow() {
    try {
      await updateProfile.mutateAsync({ onboardingDone: true });
      router.replace('/(member)/dashboard');
    } catch (err) {
      setError(formatApiError(err, 'Could not save. Please try again.'));
    }
  }

  // Save every answer, then ask the API for the pace options.
  async function saveAnswersAndPlan() {
    setError(null);
    try {
      await updateProfile.mutateAsync({
        healthDataConsent: true,
        fitnessGoal: goal ?? undefined,
        sex: sex ?? undefined,
        unitSystem: units,
        age: ageN ?? undefined,
        heightCm: heightCmN ?? undefined,
        weightKg: weightKg ?? undefined,
        // null clears a goal weight saved earlier (e.g. after switching to "Get fit").
        targetWeightKg: targetKg,
        activityLevel: activity ?? undefined,
        daysPerWeek: days ?? undefined,
        experienceLevel: experience ?? undefined,
        dietType: diet,
        injuries: injuries.trim() || null,
        healthCaution,
      });
      setPace(null);
      setPlanReady(true);
      next();
    } catch (err) {
      setError(formatApiError(err, 'Could not save your answers. Please try again.'));
    }
  }

  // When fresh options arrive, preselect the recommended pace. Ignore cached options
  // from an earlier visit while the new answers are being recalculated.
  // A failed refetch keeps the previous data, so an error must win over it.
  const optionsSettled = Boolean(options.data) && !options.isFetching && !options.isError;
  useEffect(() => {
    if (optionsSettled && pace === null) setPace(options.data!.recommendedPace);
  }, [optionsSettled, options.data, pace]);

  const optionsError = options.error as (Error & ApiErrorFields) | null;
  const fixStep = optionsError?.code ? ERROR_STEP[optionsError.code] : undefined;

  async function confirmPlan() {
    setError(null);
    try {
      const plan = await savePlan.mutateAsync(pace ?? undefined);
      setSavedTargets({
        targets: { kcal: plan.targetKcal, proteinG: plan.proteinG, carbsG: plan.carbsG, fatG: plan.fatG, waterMl: plan.waterMl },
        targetDate: plan.targetDate,
      });
      next();
    } catch (err) {
      setError(formatApiError(err, 'Could not save your plan. Please try again.'));
    }
  }

  async function finish() {
    try {
      await updateProfile.mutateAsync({ onboardingDone: true });
      router.replace('/(member)/dashboard');
    } catch (err) {
      setError(formatApiError(err, 'Something went wrong. Please try again.'));
    }
  }

  // ── Copy per step ────────────────────────────────────────────────────────────
  const coach: Record<Step, string[]> = {
    welcome: [`Hey ${firstName}! Welcome to ${gymName}.`, "I'm your coach. Let's build your plan together — it takes about a minute."],
    consent: ['Quick thing first.', 'To work out your calories I need a few health details. Is that okay?'],
    goal: ['What are we chasing?'],
    sex: ['Which formula should I use for your calories?'],
    body: ['Now your numbers. Pick the units you like.'],
    target: targetRequired ? ["What's your goal weight?"] : ['Do you have a goal weight? You can skip this.'],
    activity: ['How active is a normal day for you?', 'Count your job and walking too, not just workouts.'],
    training: ['How often do you want to train, and how experienced are you?'],
    diet: ['Last one. Anything I should know about how you eat or your health?'],
    plan:
      options.data?.direction === FitnessDirection.MAINTAIN
        ? ["Here's what keeps you where you are."]
        : ['Done the maths. Pick your pace.'],
    reveal: [`That's your plan, ${firstName}.`, "Log your meals and I'll keep score."],
  };

  // Read the new question aloud when a screen reader is on.
  const coachText = coach[step].join(' ');
  useEffect(() => {
    if (screenReader) AccessibilityInfo.announceForAccessibility(coachText);
  }, [screenReader, coachText]);

  // ── Per-step body and primary action ─────────────────────────────────────────
  let body: React.ReactNode = null;
  let action: { label: string; onPress: () => void; disabled?: boolean; loading?: boolean } | null = null;
  let secondary: { label: string; onPress: () => void } | null = null;

  switch (step) {
    case 'welcome':
      action = { label: "Let's go", onPress: next };
      break;

    case 'consent':
      body = (
        <View style={styles.card(colors)}>
          {[
            ['body-outline', 'Age, height, weight, sex and any health condition you tell me about'],
            ['calculator-outline', 'Used only to calculate your calories and goal date'],
            ['eye-off-outline', 'Gym staff cannot see your health details'],
            ['refresh-outline', 'You can withdraw this anytime in your profile; your plan is then deleted'],
          ].map(([icon, text]) => (
            <View key={text} style={styles.consentRow}>
              <Ionicons name={icon as 'body-outline'} size={18} color={theme.primary} />
              <Text variant="label" style={{ color: colors.text, flex: 1 }}>
                {text}
              </Text>
            </View>
          ))}
          {error && <Notice tone="error">{error}</Notice>}
        </View>
      );
      action = { label: 'I agree', onPress: next };
      secondary = { label: 'Not now', onPress: skipForNow };
      break;

    case 'goal':
      body = <OptionList options={GOAL_OPTIONS} value={goal} onChange={setGoal} />;
      action = { label: 'Continue', onPress: next, disabled: !goal };
      break;

    case 'sex':
      body = (
        <View style={styles.gap}>
          <OptionList options={SEX_OPTIONS} value={sex} onChange={setSex} />
          <Text variant="caption" style={{ color: colors.textMuted }}>
            Only used in the calorie formula.
          </Text>
        </View>
      );
      action = { label: 'Continue', onPress: next, disabled: !sex };
      break;

    case 'body':
      body = (
        <View style={styles.gap}>
          <SegmentedToggle
            options={[
              { value: UnitSystem.METRIC, label: 'kg · cm' },
              { value: UnitSystem.IMPERIAL, label: 'lb · ft' },
            ]}
            value={units}
            onChange={switchUnits}
          />
          <NumberField label="Age" value={age} onChange={setAge} suffix="years" error={bodyErrors.age} />
          {imperial ? (
            <View style={styles.row}>
              <NumberField
                label="Height"
                accessibilityLabel="Height, feet"
                value={heightFt}
                onChange={setHeightFt}
                suffix="ft"
              />
              <NumberField
                label=" "
                accessibilityLabel="Height, inches"
                value={heightIn}
                onChange={setHeightIn}
                suffix="in"
              />
            </View>
          ) : (
            <NumberField label="Height" value={heightCm} onChange={setHeightCm} suffix="cm" />
          )}
          {bodyErrors.height && (
            <Text variant="caption" style={{ color: colors.error }}>
              {bodyErrors.height}
            </Text>
          )}
          <NumberField
            label="Current weight"
            value={weight}
            onChange={setWeight}
            suffix={weightUnit}
            decimal
            error={bodyErrors.weight}
          />
        </View>
      );
      action = { label: 'Continue', onPress: next, disabled: !bodyValid };
      break;

    case 'target':
      body = (
        <NumberField
          label="Goal weight"
          value={target}
          onChange={setTarget}
          suffix={weightUnit}
          decimal
          error={targetError}
        />
      );
      action = {
        label: 'Continue',
        onPress: next,
        disabled: targetRequired ? !target || Boolean(targetError) : Boolean(targetError),
      };
      if (!targetRequired) {
        secondary = {
          label: 'Skip',
          onPress: () => {
            setTarget('');
            next();
          },
        };
      }
      break;

    case 'activity':
      body = <OptionList options={ACTIVITY_OPTIONS} value={activity} onChange={setActivity} />;
      action = { label: 'Continue', onPress: next, disabled: !activity };
      break;

    case 'training':
      body = (
        <View style={styles.gap}>
          <Text variant="label" style={{ color: colors.textSecondary }}>
            Workouts per week
          </Text>
          <View style={styles.daysRow}>
            {DAYS_OPTIONS.map((d) => {
              const selected = d.value === days;
              return (
                <Pressable
                  key={d.value}
                  onPress={() => setDays(d.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${d.value} times a week`}
                  style={[
                    styles.dayChip,
                    {
                      backgroundColor: selected ? theme.primary : colors.surface,
                      borderColor: selected ? theme.primary : colors.border,
                    },
                  ]}
                >
                  <Text variant="bodyMed" style={{ color: selected ? colors.onPrimary : colors.text }}>
                    {d.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text variant="label" style={{ color: colors.textSecondary, marginTop: 8 }}>
            Experience
          </Text>
          <OptionList options={EXPERIENCE_OPTIONS} value={experience} onChange={setExperience} />
        </View>
      );
      action = { label: 'Continue', onPress: next, disabled: !days || !experience };
      break;

    case 'diet':
      body = (
        <View style={styles.gap}>
          <OptionList options={DIET_OPTIONS} value={diet} onChange={setDiet} columns={2} />
          <Text variant="label" style={{ color: colors.textSecondary, marginTop: 8 }}>
            Injuries or limits (optional)
          </Text>
          <TextInput
            value={injuries}
            onChangeText={setInjuries}
            placeholder="e.g. bad left knee"
            placeholderTextColor={colors.textMuted}
            maxLength={500}
            style={[styles.textArea, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
            accessibilityLabel="Injuries or limits"
          />
          <Pressable
            onPress={() => setHealthCaution((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: healthCaution }}
            style={[styles.checkRow, { borderColor: healthCaution ? theme.primary : colors.border, backgroundColor: colors.surface }]}
          >
            <Ionicons
              name={healthCaution ? 'checkbox' : 'square-outline'}
              size={22}
              color={healthCaution ? theme.primary : colors.textMuted}
            />
            <Text variant="label" style={{ color: colors.text, flex: 1 }}>
              I&apos;m pregnant or have a medical condition
            </Text>
          </Pressable>
          {error && <Notice tone="error">{error}</Notice>}
        </View>
      );
      action = { label: 'Build my plan', onPress: saveAnswersAndPlan, loading: updateProfile.isPending };
      break;

    case 'plan':
      if (!optionsSettled || !options.data) {
        body = optionsError && !options.isFetching ? (
          <View style={styles.gap}>
            <Notice tone="error">{formatApiError(optionsError, 'Could not calculate your plan.')}</Notice>
          </View>
        ) : (
          <View style={styles.calculating}>
            <Ionicons name="calculator-outline" size={28} color={theme.primary} />
            <Text variant="bodyMed" style={{ color: colors.textSecondary }}>
              Calculating your plan…
            </Text>
          </View>
        );
        action = optionsError && !options.isFetching
          ? fixStep
            ? { label: 'Fix my answers', onPress: () => { setPlanReady(false); goTo(fixStep); } }
            : { label: 'Try again', onPress: () => options.refetch() }
          : null;
      } else {
        const data = options.data;
        const maintain = data.direction === FitnessDirection.MAINTAIN;
        body = (
          <View style={styles.gap}>
            {data.adviseProfessional && (
              <Notice tone="warning">
                Please check this plan with a doctor or health professional before you start.
              </Notice>
            )}
            {maintain ? (
              <View style={styles.card(colors)}>
                <Text variant="caption" style={{ color: colors.textSecondary }}>
                  MAINTENANCE
                </Text>
                <Text variant="h1" style={{ color: colors.text }}>
                  {data.maintenance.kcal.toLocaleString()} kcal / day
                </Text>
              </View>
            ) : (
              <PaceCards
                options={data.options}
                selected={pace}
                recommended={data.recommendedPace}
                unit={weightUnit}
                onSelect={setPace}
              />
            )}
            {!maintain && !data.recommendedPace && (
              <Notice tone="info">
                Your calories can&apos;t safely go lower. Moving more each day is the way to make progress.
              </Notice>
            )}
            {error && <Notice tone="error">{error}</Notice>}
          </View>
        );
        action =
          !maintain && !data.recommendedPace
            ? // No pace is safe: finish without a plan rather than leave the member stuck.
              { label: 'Continue without a plan', onPress: skipForNow, loading: updateProfile.isPending }
            : { label: 'Use this plan', onPress: confirmPlan, loading: savePlan.isPending, disabled: !maintain && !pace };
      }
      break;

    case 'reveal':
      body = savedTargets ? (
        <View style={styles.gap}>
          <TargetsReveal targets={savedTargets.targets} />
          {savedTargets.targetDate && (
            <Text variant="label" style={{ color: colors.textSecondary, textAlign: 'center' }}>
              On track to reach your goal by {formatGoalDate(savedTargets.targetDate)}
            </Text>
          )}
          {error && <Notice tone="error">{error}</Notice>}
        </View>
      ) : null;
      action = { label: 'Go to my dashboard', onPress: finish, loading: updateProfile.isPending };
      break;
  }

  const progress = index / (STEPS.length - 1);
  const showBack = index > 0 && step !== 'reveal';

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.topBar}>
          {showBack ? (
            <Pressable onPress={back} accessibilityRole="button" accessibilityLabel="Back" hitSlop={10}>
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </Pressable>
          ) : (
            <View style={styles.topBarSpacer} />
          )}
          <View
            style={[styles.progressTrack, { backgroundColor: colors.border }]}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: STEPS.length - 1, now: index }}
          >
            <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: theme.primary }]} />
          </View>
          <View style={styles.topBarSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, step === 'welcome' && styles.contentCentered]}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={[styles.gap, { opacity: fade }]}>
            {step === 'welcome' ? (
              <View style={styles.hero}>
                <WelcomeStage talking={!typed} />
                <CoachMessage
                  key={step}
                  lines={coach.welcome}
                  avatar={false}
                  centered
                  onDone={() => setTyped(true)}
                />
              </View>
            ) : (
              <>
                <CoachMessage key={step} lines={coach[step]} onDone={() => setTyped(true)} />
                {/* Inputs appear once the coach has finished "typing". */}
                {(typed || instant) && <View style={styles.body}>{body}</View>}
              </>
            )}
          </Animated.View>
        </ScrollView>

        <View style={styles.footer}>
          {action && (typed || instant) && (
            <PrimaryButton
              label={action.label}
              onPress={action.onPress}
              disabled={action.disabled}
              loading={action.loading}
            />
          )}
          {secondary && (typed || instant) && <TextButton label={secondary.label} onPress={secondary.onPress} />}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = {
  ...StyleSheet.create({
    root: { flex: 1 },
    topBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
    topBarSpacer: { width: 24 },
    progressTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 3 },
    content: { padding: 20, paddingBottom: 32 },
    contentCentered: { flexGrow: 1, justifyContent: 'center' },
    gap: { gap: 12 },
    hero: { gap: 20, paddingTop: 12 },
    body: { marginTop: 8 },
    row: { flexDirection: 'row', gap: 10 },
    consentRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
    daysRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    dayChip: { width: 44, height: 44, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
    textArea: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
    checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderRadius: 12, padding: 12 },
    calculating: { alignItems: 'center', gap: 10, paddingVertical: 32 },
    footer: { paddingHorizontal: 20, paddingBottom: 12, gap: 4 },
  }),
  card: (colors: { surface: string; border: string }) => ({
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  }),
};
