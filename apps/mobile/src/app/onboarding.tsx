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
import { memberService } from '../services/member.service';
import { AnimatedMascot } from '../components/AnimatedMascot';
import { COLORS, FONT, RADIUS, SPACING } from '../constants/theme';

const NUM_STEPS = 6;

const FITNESS_GOALS = [
  { value: 'LOSE_WEIGHT', label: 'Lose Weight', emoji: '🔥' },
  { value: 'BUILD_MUSCLE', label: 'Build Muscle', emoji: '💪' },
  { value: 'GET_FIT', label: 'Get Fit', emoji: '🏃' },
  { value: 'STAY_HEALTHY', label: 'Stay Healthy', emoji: '🥗' },
  { value: 'OTHER', label: 'Other', emoji: '✨' },
];

const ACTIVITY_LEVELS = [
  { value: 'BEGINNER', label: 'Just Starting', emoji: '🌱' },
  { value: 'OCCASIONALLY_ACTIVE', label: 'Occasionally Active', emoji: '🚶' },
  { value: 'PRETTY_ACTIVE', label: 'Pretty Active', emoji: '🏋️' },
  { value: 'VERY_ACTIVE', label: 'Very Active', emoji: '⚡' },
];

export default function OnboardingScreen() {
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const translateX = useRef(new Animated.Value(0)).current;
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [age, setAge] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [fitnessGoal, setFitnessGoal] = useState('');
  const [activityLevel, setActivityLevel] = useState('');

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

  async function handleFinish(level: string) {
    if (!user) return;
    setSubmitting(true);
    try {
      await memberService.updateMyProfile(user.gymId, {
        age: age ? parseInt(age, 10) : undefined,
        weightKg: weightKg ? parseFloat(weightKg) : undefined,
        heightCm: heightCm ? parseInt(heightCm, 10) : undefined,
        fitnessGoal: fitnessGoal || undefined,
        activityLevel: level || undefined,
        onboardingDone: true,
      });
      router.replace('/(member)/dashboard');
    } catch {
      setSubmitting(false);
    }
  }

  const canContinueStep1 = age.trim().length > 0;
  const canContinueStep2 = weightKg.trim().length > 0;
  const canContinueStep3 = heightCm.trim().length > 0;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Progress dots */}
      <View style={styles.dotsRow}>
        {Array.from({ length: NUM_STEPS }).map((_, i) => (
          <View key={i} style={[styles.dot, i <= step && styles.dotActive]} />
        ))}
      </View>

      {/* Small mascot companion pinned top-right on steps 1–5 */}
      {step > 0 && (
        <View style={styles.mascotCorner}>
          <AnimatedMascot size="sm" />
        </View>
      )}

      {/* Slides */}
      <View style={{ flex: 1, overflow: 'hidden' }}>
        <Animated.View
          style={[styles.slidesRow, { width: width * NUM_STEPS, transform: [{ translateX }] }]}
        >
          {/* Step 0 — Intro */}
          <View style={[styles.slide, { width }]}>
            <View style={styles.introMascotWrap}>
              <AnimatedMascot size="lg" enterAnim />
            </View>
            <Text style={styles.headline}>Hey {firstName}!</Text>
            <Text style={styles.subheading}>
              Let's set up your fitness profile. It only takes a minute and helps personalise your experience.
            </Text>
            <Pressable style={styles.btnPrimary} onPress={goNext}>
              <LinearGradient colors={['#6EE7B7', '#3B82F6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnGradient}>
                <Text style={styles.btnPrimaryText}>Let's go →</Text>
              </LinearGradient>
            </Pressable>
          </View>

          {/* Step 1 — Age */}
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
            <Pressable
              style={[styles.btnPrimary, !canContinueStep1 && styles.btnDisabled]}
              onPress={canContinueStep1 ? goNext : undefined}
            >
              <LinearGradient colors={['#6EE7B7', '#3B82F6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnGradient}>
                <Text style={styles.btnPrimaryText}>Continue →</Text>
              </LinearGradient>
            </Pressable>
            <Pressable style={styles.skip} onPress={goNext}>
              <Text style={styles.skipText}>Skip for now</Text>
            </Pressable>
          </View>

          {/* Step 2 — Weight */}
          <View style={[styles.slide, { width }]}>
            <Text style={styles.stepEmoji}>⚖️</Text>
            <Text style={styles.headline}>What's your weight?</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={weightKg}
                onChangeText={setWeightKg}
                keyboardType="decimal-pad"
                placeholder="e.g. 75"
                placeholderTextColor={COLORS.textMuted}
                maxLength={6}
              />
              <Text style={styles.unit}>kg</Text>
            </View>
            <Pressable
              style={[styles.btnPrimary, !canContinueStep2 && styles.btnDisabled]}
              onPress={canContinueStep2 ? goNext : undefined}
            >
              <LinearGradient colors={['#6EE7B7', '#3B82F6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnGradient}>
                <Text style={styles.btnPrimaryText}>Continue →</Text>
              </LinearGradient>
            </Pressable>
            <Pressable style={styles.skip} onPress={goNext}>
              <Text style={styles.skipText}>Skip for now</Text>
            </Pressable>
          </View>

          {/* Step 3 — Height */}
          <View style={[styles.slide, { width }]}>
            <Text style={styles.stepEmoji}>📏</Text>
            <Text style={styles.headline}>How tall are you?</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={heightCm}
                onChangeText={setHeightCm}
                keyboardType="number-pad"
                placeholder="e.g. 175"
                placeholderTextColor={COLORS.textMuted}
                maxLength={3}
              />
              <Text style={styles.unit}>cm</Text>
            </View>
            <Pressable
              style={[styles.btnPrimary, !canContinueStep3 && styles.btnDisabled]}
              onPress={canContinueStep3 ? goNext : undefined}
            >
              <LinearGradient colors={['#6EE7B7', '#3B82F6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnGradient}>
                <Text style={styles.btnPrimaryText}>Continue →</Text>
              </LinearGradient>
            </Pressable>
            <Pressable style={styles.skip} onPress={goNext}>
              <Text style={styles.skipText}>Skip for now</Text>
            </Pressable>
          </View>

          {/* Step 4 — Fitness goal */}
          <View style={[styles.slide, { width }]}>
            <Text style={styles.stepEmoji}>🎯</Text>
            <Text style={styles.headline}>What's your main goal?</Text>
            <ScrollView contentContainerStyle={styles.cards} showsVerticalScrollIndicator={false}>
              {FITNESS_GOALS.map((g) => (
                <Pressable
                  key={g.value}
                  style={[styles.card, fitnessGoal === g.value && styles.cardSelected]}
                  onPress={() => { setFitnessGoal(g.value); setTimeout(goNext, 150); }}
                >
                  <Text style={styles.cardEmoji}>{g.emoji}</Text>
                  <Text style={[styles.cardLabel, fitnessGoal === g.value && styles.cardLabelSelected]}>
                    {g.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable style={styles.skip} onPress={goNext}>
              <Text style={styles.skipText}>Skip for now</Text>
            </Pressable>
          </View>

          {/* Step 5 — Activity level */}
          <View style={[styles.slide, { width }]}>
            <Text style={styles.stepEmoji}>⚡</Text>
            <Text style={styles.headline}>How active are you?</Text>
            <ScrollView contentContainerStyle={styles.cards} showsVerticalScrollIndicator={false}>
              {ACTIVITY_LEVELS.map((a) => (
                <Pressable
                  key={a.value}
                  style={[styles.card, activityLevel === a.value && styles.cardSelected, submitting && styles.btnDisabled]}
                  onPress={() => {
                    if (submitting) return;
                    setActivityLevel(a.value);
                    handleFinish(a.value);
                  }}
                >
                  <Text style={styles.cardEmoji}>{a.emoji}</Text>
                  <Text style={[styles.cardLabel, activityLevel === a.value && styles.cardLabelSelected]}>
                    {a.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              style={styles.skip}
              onPress={() => !submitting && handleFinish('')}
            >
              <Text style={styles.skipText}>Skip for now</Text>
            </Pressable>
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 56,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: SPACING.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  dotActive: {
    backgroundColor: COLORS.primary,
    width: 20,
    borderRadius: 4,
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
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl,
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
  cardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#0D2B22',
  },
  cardEmoji: { fontSize: 24 },
  cardLabel: {
    fontSize: 16,
    color: COLORS.text,
    ...FONT.medium,
  },
  cardLabelSelected: { color: COLORS.primaryLight },
  backBtn: { padding: SPACING.lg },
  backText: {
    color: COLORS.textSecondary,
    fontSize: 16,
  },
});
