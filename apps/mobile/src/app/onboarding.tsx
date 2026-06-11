import { useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { memberService } from '../services/member.service';
import { AnimatedMascot } from '../components/AnimatedMascot';
import { COLORS, FONT, RADIUS, SPACING } from '../constants/theme';
import {
  FitnessGoal,
  ActivityLevel,
  ExperienceLevel,
  PreferredStyle,
  DietType,
} from '../constants/enums';

const NUM_STEPS = 11;

const FITNESS_GOAL_OPTIONS = [
  { value: FitnessGoal.LOSE_WEIGHT,  label: 'Lose Weight',   emoji: '🔥' },
  { value: FitnessGoal.BUILD_MUSCLE, label: 'Build Muscle',  emoji: '💪' },
  { value: FitnessGoal.GET_FIT,      label: 'Get Fit',       emoji: '🏃' },
  { value: FitnessGoal.STAY_HEALTHY, label: 'Stay Healthy',  emoji: '🥗' },
  { value: FitnessGoal.OTHER,        label: 'Other',         emoji: '✨' },
];

const ACTIVITY_LEVEL_OPTIONS = [
  { value: ActivityLevel.BEGINNER,            label: 'Just Starting',      emoji: '🌱' },
  { value: ActivityLevel.OCCASIONALLY_ACTIVE, label: 'Occasionally Active', emoji: '🚶' },
  { value: ActivityLevel.PRETTY_ACTIVE,       label: 'Pretty Active',       emoji: '🏋️' },
  { value: ActivityLevel.VERY_ACTIVE,         label: 'Very Active',         emoji: '⚡' },
];

const EXPERIENCE_LEVEL_OPTIONS = [
  { value: ExperienceLevel.BEGINNER,     label: 'Beginner',      emoji: '🌱', desc: 'Less than 1 year training' },
  { value: ExperienceLevel.INTERMEDIATE, label: 'Intermediate',  emoji: '🏋️', desc: '1–3 years training' },
  { value: ExperienceLevel.ADVANCED,     label: 'Advanced',      emoji: '🔱', desc: '3+ years training' },
];

const PREFERRED_STYLE_OPTIONS = [
  { value: PreferredStyle.WEIGHTS, label: 'Weight Training', emoji: '🏋️', desc: 'Barbells, dumbbells, machines' },
  { value: PreferredStyle.CARDIO,  label: 'Cardio',          emoji: '🏃', desc: 'Running, cycling, rowing' },
  { value: PreferredStyle.MIXED,   label: 'Mixed',           emoji: '⚡', desc: 'Weights + cardio combined' },
  { value: PreferredStyle.HIIT,    label: 'HIIT',            emoji: '🔥', desc: 'High-intensity intervals' },
];

const DIET_TYPE_OPTIONS = [
  { value: DietType.NONE,        label: 'No restriction', emoji: '🍽️' },
  { value: DietType.VEGETARIAN,  label: 'Vegetarian',     emoji: '🥦' },
  { value: DietType.VEGAN,       label: 'Vegan',          emoji: '🌱' },
  { value: DietType.HALAL,       label: 'Halal',          emoji: '☪️' },
  { value: DietType.GLUTEN_FREE, label: 'Gluten-Free',    emoji: '🌾' },
];

const DAYS_OPTIONS = [1, 2, 3, 4, 5, 6, 7];

export default function OnboardingScreen() {
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const { theme } = useTheme();
  const translateX = useRef(new Animated.Value(0)).current;
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Step 1–3: body stats
  const [age, setAge] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [targetWeightKg, setTargetWeightKg] = useState('');
  const [heightCm, setHeightCm] = useState('');
  // Step 4–5: existing fields
  const [fitnessGoal, setFitnessGoal] = useState<FitnessGoal | ''>('');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | ''>('');
  // Steps 6–10: new fields
  const [daysPerWeek, setDaysPerWeek] = useState<number | null>(null);
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel | ''>('');
  const [preferredStyle, setPreferredStyle] = useState<PreferredStyle | ''>('');
  const [dietType, setDietType] = useState<DietType | ''>('');
  const [injuries, setInjuries] = useState('');

  const firstName = user?.fullName?.split(' ')[0] || 'there';

  function animateTo(next: number) {
    Animated.spring(translateX, {
      toValue: -width * next,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  }

  function goNext() {
    const next = step + 1;
    setStep(next);
    animateTo(next);
  }

  function goBack() {
    if (step === 0) return;
    const prev = step - 1;
    setStep(prev);
    animateTo(prev);
  }

  async function handleFinish() {
    if (!user) return;
    setSubmitting(true);
    try {
      await memberService.updateMyProfile(user.gymId, {
        age: age ? parseInt(age, 10) : undefined,
        weightKg: weightKg ? parseFloat(weightKg) : undefined,
        targetWeightKg: targetWeightKg ? parseFloat(targetWeightKg) : undefined,
        heightCm: heightCm ? parseInt(heightCm, 10) : undefined,
        fitnessGoal: fitnessGoal || undefined,
        activityLevel: activityLevel || undefined,
        daysPerWeek: daysPerWeek ?? undefined,
        experienceLevel: experienceLevel || undefined,
        preferredStyle: preferredStyle || undefined,
        dietType: dietType || undefined,
        injuries: injuries.trim() || undefined,
        onboardingDone: true,
      });
      router.replace('/(member)/dashboard');
    } catch {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Progress dots */}
      <View style={styles.dotsRow}>
        {Array.from({ length: NUM_STEPS }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i <= step && styles.dotActive,
              i <= step && { backgroundColor: theme.primary },
            ]}
          />
        ))}
      </View>

      {step > 0 && (
        <View style={styles.mascotCorner}>
          <AnimatedMascot size="sm" />
        </View>
      )}

      <View style={{ flex: 1, overflow: 'hidden' }}>
        <Animated.View
          style={[styles.slidesRow, { width: width * NUM_STEPS, transform: [{ translateX }] }]}
        >
          {/* ── Step 0 — Intro ─────────────────────────────────────────────── */}
          <View style={[styles.slide, { width }]}>
            <View style={styles.introMascotWrap}>
              <AnimatedMascot size="lg" enterAnim />
            </View>
            <Text style={styles.headline}>Hey {firstName}!</Text>
            <Text style={styles.subheading}>
              Let's build your fitness profile. A few quick questions help us personalise your workouts and nutrition plans.
            </Text>
            <Pressable style={styles.btnPrimary} onPress={goNext}>
              <LinearGradient colors={theme.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnGradient}>
                <Text style={styles.btnPrimaryText}>Let's go →</Text>
              </LinearGradient>
            </Pressable>
          </View>

          {/* ── Step 1 — Age ───────────────────────────────────────────────── */}
          <View style={[styles.slide, { width }]}>
            <Text style={styles.stepEmoji}>🎂</Text>
            <Text style={styles.headline}>How old are you?</Text>
            <TextInput
              style={styles.input}
              value={age}
              onChangeText={setAge}
              keyboardType="number-pad"
              placeholder="e.g. 28"
              placeholderTextColor={COLORS.textMuted}
              maxLength={3}
            />
            <ContinueBtn canContinue={age.trim().length > 0} onPress={goNext} gradient={theme.gradient} />
            <SkipBtn onPress={goNext} />
          </View>

          {/* ── Step 2 — Weight ────────────────────────────────────────────── */}
          <View style={[styles.slide, { width }]}>
            <Text style={styles.stepEmoji}>⚖️</Text>
            <Text style={styles.headline}>Current weight?</Text>
            <UnitInput value={weightKg} onChange={setWeightKg} unit="kg" placeholder="e.g. 75" />
            <ContinueBtn canContinue={weightKg.trim().length > 0} onPress={goNext} gradient={theme.gradient} />
            <SkipBtn onPress={goNext} />
          </View>

          {/* ── Step 3 — Target weight ─────────────────────────────────────── */}
          <View style={[styles.slide, { width }]}>
            <Text style={styles.stepEmoji}>🎯</Text>
            <Text style={styles.headline}>Target weight?</Text>
            <Text style={styles.subheading}>Optional — helps the AI tailor your plan.</Text>
            <UnitInput value={targetWeightKg} onChange={setTargetWeightKg} unit="kg" placeholder="e.g. 68" />
            <ContinueBtn canContinue={true} onPress={goNext} label="Continue →" gradient={theme.gradient} />
          </View>

          {/* ── Step 4 — Height ────────────────────────────────────────────── */}
          <View style={[styles.slide, { width }]}>
            <Text style={styles.stepEmoji}>📏</Text>
            <Text style={styles.headline}>How tall are you?</Text>
            <UnitInput value={heightCm} onChange={setHeightCm} unit="cm" placeholder="e.g. 175" keyboardType="number-pad" />
            <ContinueBtn canContinue={heightCm.trim().length > 0} onPress={goNext} gradient={theme.gradient} />
            <SkipBtn onPress={goNext} />
          </View>

          {/* ── Step 5 — Fitness goal ──────────────────────────────────────── */}
          <View style={[styles.slide, { width }]}>
            <Text style={styles.stepEmoji}>🏆</Text>
            <Text style={styles.headline}>What's your main goal?</Text>
            <ScrollView contentContainerStyle={styles.cards} showsVerticalScrollIndicator={false}>
              {FITNESS_GOAL_OPTIONS.map((g) => (
                <OptionCard
                  key={g.value}
                  emoji={g.emoji}
                  label={g.label}
                  selected={fitnessGoal === g.value}
                  theme={theme}
                  onPress={() => { setFitnessGoal(g.value); setTimeout(goNext, 150); }}
                />
              ))}
            </ScrollView>
            <SkipBtn onPress={goNext} />
          </View>

          {/* ── Step 6 — Activity level ────────────────────────────────────── */}
          <View style={[styles.slide, { width }]}>
            <Text style={styles.stepEmoji}>⚡</Text>
            <Text style={styles.headline}>How active are you?</Text>
            <ScrollView contentContainerStyle={styles.cards} showsVerticalScrollIndicator={false}>
              {ACTIVITY_LEVEL_OPTIONS.map((a) => (
                <OptionCard
                  key={a.value}
                  emoji={a.emoji}
                  label={a.label}
                  selected={activityLevel === a.value}
                  theme={theme}
                  onPress={() => { setActivityLevel(a.value); setTimeout(goNext, 150); }}
                />
              ))}
            </ScrollView>
            <SkipBtn onPress={goNext} />
          </View>

          {/* ── Step 7 — Days per week ─────────────────────────────────────── */}
          <View style={[styles.slide, { width }]}>
            <Text style={styles.stepEmoji}>📅</Text>
            <Text style={styles.headline}>Days per week?</Text>
            <Text style={styles.subheading}>How many days can you commit to training?</Text>
            <View style={styles.daysRow}>
              {DAYS_OPTIONS.map((d) => (
                <Pressable
                  key={d}
                  style={[
                    styles.dayChip,
                    daysPerWeek === d && styles.dayChipSelected,
                    daysPerWeek === d && { backgroundColor: theme.primary, borderColor: theme.primary },
                  ]}
                  onPress={() => setDaysPerWeek(d)}
                >
                  <Text style={[styles.dayChipText, daysPerWeek === d && styles.dayChipTextSelected]}>
                    {d}
                  </Text>
                </Pressable>
              ))}
            </View>
            <ContinueBtn canContinue={daysPerWeek !== null} onPress={goNext} gradient={theme.gradient} />
            <SkipBtn onPress={goNext} />
          </View>

          {/* ── Step 8 — Experience level ──────────────────────────────────── */}
          <View style={[styles.slide, { width }]}>
            <Text style={styles.stepEmoji}>🏅</Text>
            <Text style={styles.headline}>Experience level?</Text>
            <ScrollView contentContainerStyle={styles.cards} showsVerticalScrollIndicator={false}>
              {EXPERIENCE_LEVEL_OPTIONS.map((e) => (
                <OptionCard
                  key={e.value}
                  emoji={e.emoji}
                  label={e.label}
                  desc={e.desc}
                  selected={experienceLevel === e.value}
                  theme={theme}
                  onPress={() => { setExperienceLevel(e.value); setTimeout(goNext, 150); }}
                />
              ))}
            </ScrollView>
            <SkipBtn onPress={goNext} />
          </View>

          {/* ── Step 9 — Preferred style ───────────────────────────────────── */}
          <View style={[styles.slide, { width }]}>
            <Text style={styles.stepEmoji}>🏋️</Text>
            <Text style={styles.headline}>Preferred workout style?</Text>
            <ScrollView contentContainerStyle={styles.cards} showsVerticalScrollIndicator={false}>
              {PREFERRED_STYLE_OPTIONS.map((s) => (
                <OptionCard
                  key={s.value}
                  emoji={s.emoji}
                  label={s.label}
                  desc={s.desc}
                  selected={preferredStyle === s.value}
                  theme={theme}
                  onPress={() => { setPreferredStyle(s.value); setTimeout(goNext, 150); }}
                />
              ))}
            </ScrollView>
            <SkipBtn onPress={goNext} />
          </View>

          {/* ── Step 10 — Diet type ────────────────────────────────────────── */}
          <View style={[styles.slide, { width }]}>
            <Text style={styles.stepEmoji}>🥗</Text>
            <Text style={styles.headline}>Dietary preference?</Text>
            <ScrollView contentContainerStyle={styles.cards} showsVerticalScrollIndicator={false}>
              {DIET_TYPE_OPTIONS.map((d) => (
                <OptionCard
                  key={d.value}
                  emoji={d.emoji}
                  label={d.label}
                  selected={dietType === d.value}
                  theme={theme}
                  onPress={() => { setDietType(d.value); setTimeout(goNext, 150); }}
                />
              ))}
            </ScrollView>
            <SkipBtn onPress={goNext} />
          </View>

          {/* ── Step 11 — Injuries / wrap-up ───────────────────────────────── */}
          <View style={[styles.slide, { width }]}>
            <Text style={styles.stepEmoji}>🩺</Text>
            <Text style={styles.headline}>Any injuries?</Text>
            <Text style={styles.subheading}>
              Optional. Mention anything we should know so your plan avoids aggravating it (e.g. "bad lower back", "knee surgery").
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={injuries}
              onChangeText={setInjuries}
              placeholder="e.g. Lower back pain"
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={3}
              maxLength={500}
            />
            <Pressable
              style={[styles.btnPrimary, submitting && styles.btnDisabled]}
              onPress={!submitting ? handleFinish : undefined}
            >
              <LinearGradient colors={theme.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnGradient}>
                <Text style={styles.btnPrimaryText}>{submitting ? 'Saving…' : "Let's go! 🚀"}</Text>
              </LinearGradient>
            </Pressable>
            <SkipBtn onPress={!submitting ? handleFinish : undefined} label="Skip & finish" />
          </View>
        </Animated.View>
      </View>

      {step > 0 && (
        <Pressable style={styles.backBtn} onPress={goBack}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
      )}
    </KeyboardAvoidingView>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function ContinueBtn({
  canContinue,
  onPress,
  label = 'Continue →',
  gradient,
}: {
  canContinue: boolean;
  onPress: () => void;
  label?: string;
  gradient: [string, string];
}) {
  return (
    <Pressable
      style={[styles.btnPrimary, !canContinue && styles.btnDisabled]}
      onPress={canContinue ? onPress : undefined}
    >
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnGradient}>
        <Text style={styles.btnPrimaryText}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

function SkipBtn({ onPress, label = 'Skip for now' }: { onPress?: () => void; label?: string }) {
  return (
    <Pressable style={styles.skip} onPress={onPress}>
      <Text style={styles.skipText}>{label}</Text>
    </Pressable>
  );
}

function UnitInput({
  value,
  onChange,
  unit,
  placeholder,
  keyboardType = 'decimal-pad',
}: {
  value: string;
  onChange: (v: string) => void;
  unit: string;
  placeholder: string;
  keyboardType?: 'decimal-pad' | 'number-pad';
}) {
  return (
    <View style={styles.inputRow}>
      <TextInput
        style={[styles.input, { flex: 1 }]}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        maxLength={6}
      />
      <Text style={styles.unit}>{unit}</Text>
    </View>
  );
}

function OptionCard({
  emoji,
  label,
  desc,
  selected,
  theme,
  onPress,
}: {
  emoji: string;
  label: string;
  desc?: string;
  selected: boolean;
  theme: { primary: string; primaryMuted: string };
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[
        styles.card,
        selected && styles.cardSelected,
        selected && { borderColor: theme.primary, backgroundColor: theme.primaryMuted },
      ]}
      onPress={onPress}
    >
      <Text style={styles.cardEmoji}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[styles.cardLabel, selected && { color: theme.primary }]}>{label}</Text>
        {desc ? <Text style={styles.cardDesc}>{desc}</Text> : null}
      </View>
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 56,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.border,
  },
  dotActive: {
    width: 16,
    borderRadius: 3,
  },
  mascotCorner: {
    position: 'absolute',
    right: SPACING.lg,
    top: 56,
    zIndex: 10,
  },
  slidesRow: {
    flex: 1,
    flexDirection: 'row',
  },
  slide: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introMascotWrap: {
    marginBottom: SPACING.lg,
  },
  stepEmoji: {
    fontSize: 52,
    marginBottom: SPACING.sm,
  },
  headline: {
    fontSize: 26,
    color: COLORS.text,
    ...FONT.bold,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  subheading: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: SPACING.lg,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    color: COLORS.text,
    fontSize: 22,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    width: '100%',
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  textArea: {
    fontSize: 15,
    textAlign: 'left',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    width: '100%',
    marginBottom: SPACING.lg,
  },
  unit: {
    fontSize: 18,
    color: COLORS.textSecondary,
    ...FONT.medium,
  },
  daysRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  dayChip: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipSelected: {},
  dayChipText: {
    fontSize: 18,
    ...FONT.semibold,
    color: COLORS.textSecondary,
  },
  dayChipTextSelected: {
    color: '#000',
  },
  btnPrimary: {
    width: '100%',
    borderRadius: RADIUS.button,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  btnGradient: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.4 },
  btnPrimaryText: {
    color: '#000',
    fontSize: 16,
    ...FONT.semibold,
  },
  skip: { padding: SPACING.sm },
  skipText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  cards: {
    gap: SPACING.sm,
    width: '100%',
    paddingBottom: SPACING.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  cardSelected: {},
  cardEmoji: { fontSize: 24 },
  cardLabel: {
    fontSize: 16,
    color: COLORS.text,
    ...FONT.medium,
  },
  cardDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  backBtn: { padding: SPACING.lg },
  backText: {
    color: COLORS.textSecondary,
    fontSize: 16,
  },
});
