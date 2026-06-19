import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useWorkout } from '../../context/WorkoutContext';
import { workoutService } from '../../services/workout.service';
import { healthKitService } from '../../services/healthkit.service';
import { COLORS, SPACING, RADIUS, FONT } from '../../constants/theme';
import type { WorkoutType } from '../../types';

const WORKOUT_TYPES: { type: WorkoutType; icon: string; color: string }[] = [
  { type: 'Strength', icon: '💪', color: '#8B5CF6' },
  { type: 'Cardio', icon: '🏃', color: '#F97316' },
  { type: 'HIIT', icon: '⚡', color: '#EF4444' },
  { type: 'CrossFit', icon: '🔥', color: '#F59E0B' },
  { type: 'Yoga', icon: '🧘', color: '#10B981' },
  { type: 'Other', icon: '🏋️', color: '#6B7280' },
];

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

type Stage = 'select' | 'active' | 'summary';

interface SessionSummary {
  workoutType: string;
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
  caloriesBurned: number | null;
  avgHeartRate: number | null;
}

export default function WorkoutScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();
  const { activeSession, showIdlePrompt, startSession, endSession, confirmStillWorking } = useWorkout();

  const [stage, setStage] = useState<Stage>(activeSession ? 'active' : 'select');
  const [elapsed, setElapsed] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isReadingHealth, setIsReadingHealth] = useState(false);
  const [summary, setSummary] = useState<SessionSummary | null>(null);

  // Request HealthKit permissions once when the screen mounts (non-blocking)
  useEffect(() => {
    healthKitService.requestPermissions();
  }, []);

  // Keep stage in sync when context changes externally (restore on mount, auto-stop)
  useEffect(() => {
    if (activeSession && stage === 'select') setStage('active');
    if (!activeSession && stage === 'active') setStage('select');
  }, [activeSession]);

  // Live timer while in active stage
  useEffect(() => {
    if (stage !== 'active' || !activeSession) return;
    const tick = () =>
      setElapsed(Math.floor((Date.now() - new Date(activeSession.startedAt).getTime()) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [stage, activeSession]);

  async function handleStart(workoutType: WorkoutType) {
    await startSession(workoutType);
    setStage('active');
  }

  async function handleStop() {
    const result = endSession();

    // Show summary immediately with nulls — HealthKit fills in data async
    setSummary({ ...result, caloriesBurned: null, avgHeartRate: null });
    setStage('summary');

    // Read HealthKit data for the session window, then save to API with full data
    setIsReadingHealth(true);
    let caloriesBurned: number | null = null;
    let avgHeartRate: number | null = null;

    if (healthKitService.isAvailable()) {
      const metrics = await healthKitService.readSessionMetrics(result.startedAt, result.endedAt);
      caloriesBurned = metrics.caloriesBurned;
      avgHeartRate = metrics.avgHeartRate;
      setSummary((prev) => prev ? { ...prev, caloriesBurned, avgHeartRate } : prev);
    }

    setIsReadingHealth(false);

    if (user?.gymId) {
      setIsSaving(true);
      try {
        await workoutService.logSession(user.gymId, {
          workoutType: result.workoutType,
          startedAt: result.startedAt,
          endedAt: result.endedAt,
          durationMinutes: result.durationMinutes,
          caloriesBurned: caloriesBurned ?? undefined,
          avgHeartRate: avgHeartRate ?? undefined,
        });
      } catch {
        // Non-blocking — summary is shown even if the API call fails
      } finally {
        setIsSaving(false);
      }
    }
  }

  // ─── SELECT ───────────────────────────────────────────────────────────
  if (stage === 'select') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={COLORS.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Start Workout</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.selectContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.selectHeading}>What are you training today?</Text>
          <Text style={styles.selectSub}>Choose a type to begin your session</Text>

          <View style={styles.typeGrid}>
            {WORKOUT_TYPES.map(({ type, icon, color }) => (
              <Pressable
                key={type}
                style={({ pressed }) => [styles.typeCard, pressed && styles.typeCardPressed]}
                onPress={() => handleStart(type)}
              >
                <View style={[styles.typeIconBubble, { backgroundColor: color + '28' }]}>
                  <Text style={styles.typeEmoji}>{icon}</Text>
                </View>
                <Text style={styles.typeLabel}>{type}</Text>
                <Ionicons name="chevron-forward" size={14} color={COLORS.textMuted} />
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  // ─── ACTIVE ───────────────────────────────────────────────────────────
  if (stage === 'active' && activeSession) {
    const typeInfo = WORKOUT_TYPES.find((t) => t.type === activeSession.workoutType);
    return (
      <View style={styles.container}>
        {/* Idle prompt */}
        <Modal visible={showIdlePrompt} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalEmoji}>⏰</Text>
              <Text style={styles.modalTitle}>Still working out?</Text>
              <Text style={styles.modalBody}>
                You've been active a while. Are you still training?
              </Text>
              <Pressable
                style={[styles.modalPrimaryBtn, { backgroundColor: theme.primary }]}
                onPress={confirmStillWorking}
              >
                <Text style={styles.modalPrimaryBtnText}>Yes, keep going!</Text>
              </Pressable>
              <Pressable style={styles.modalGhostBtn} onPress={handleStop}>
                <Text style={styles.modalGhostBtnText}>Stop session</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <View style={styles.activeWrapper}>
          <View style={styles.header}>
            <View style={styles.headerSpacer} />
            <Text style={styles.headerTitle}>In Progress</Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Type badge */}
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeEmoji}>{typeInfo?.icon ?? '🏋️'}</Text>
            <Text style={styles.typeBadgeLabel}>{activeSession.workoutType}</Text>
          </View>

          {/* Timer ring */}
          <LinearGradient
            colors={theme.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.timerRing}
          >
            <View style={styles.timerInner}>
              <Text style={styles.timerText}>{formatDuration(elapsed)}</Text>
              <Text style={styles.timerLabel}>elapsed</Text>
            </View>
          </LinearGradient>

          <Text style={styles.startedAt}>
            Started at{' '}
            {new Date(activeSession.startedAt).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>

          <Pressable
            style={({ pressed }) => [styles.stopBtn, pressed && { opacity: 0.8 }]}
            onPress={handleStop}
          >
            <Ionicons name="stop-circle" size={22} color={COLORS.error} />
            <Text style={styles.stopBtnText}>End Workout</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ─── SUMMARY ──────────────────────────────────────────────────────────
  if (stage === 'summary' && summary) {
    const typeInfo = WORKOUT_TYPES.find((t) => t.type === summary.workoutType);
    const startDate = new Date(summary.startedAt);
    const endDate = new Date(summary.endedAt);

    const statusText = isReadingHealth
      ? 'Reading health data…'
      : isSaving
      ? 'Saving your session…'
      : 'Your session has been saved.';

    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.summaryContent} showsVerticalScrollIndicator={false}>
          <View style={styles.doneHeader}>
            <LinearGradient
              colors={theme.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.doneCircle}
            >
              <Ionicons name="checkmark" size={40} color="#000" />
            </LinearGradient>
            <Text style={styles.doneTitle}>Workout Complete!</Text>
            <Text style={styles.doneSub}>{statusText}</Text>
            {(isReadingHealth || isSaving) && (
              <ActivityIndicator color={theme.primary} size="small" style={{ marginTop: 6 }} />
            )}
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Type</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.summaryEmoji}>{typeInfo?.icon ?? '🏋️'}</Text>
                <Text style={styles.summaryValue}>{summary.workoutType}</Text>
              </View>
            </View>
            <View style={[styles.summaryRow, styles.summaryRowBorder]}>
              <Text style={styles.summaryLabel}>Duration</Text>
              <Text style={[styles.summaryValue, { color: theme.primary }]}>
                {summary.durationMinutes} min
              </Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryRowBorder]}>
              <Text style={styles.summaryLabel}>Started</Text>
              <Text style={styles.summaryValue}>
                {startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryRowBorder]}>
              <Text style={styles.summaryLabel}>Ended</Text>
              <Text style={styles.summaryValue}>
                {endDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>

            {/* HealthKit rows — shown only when data is available or still loading */}
            {(isReadingHealth || summary.caloriesBurned != null) && (
              <View style={[styles.summaryRow, styles.summaryRowBorder]}>
                <View style={styles.summaryLabelRow}>
                  <Text style={styles.summaryLabel}>Calories</Text>
                  <Text style={styles.hkBadge}>  Health</Text>
                </View>
                {isReadingHealth && summary.caloriesBurned == null ? (
                  <ActivityIndicator color={theme.primary} size="small" />
                ) : (
                  <Text style={styles.summaryValue}>{summary.caloriesBurned} kcal</Text>
                )}
              </View>
            )}

            {(isReadingHealth || summary.avgHeartRate != null) && (
              <View style={[styles.summaryRow, styles.summaryRowBorder, styles.summaryRowLast]}>
                <View style={styles.summaryLabelRow}>
                  <Text style={styles.summaryLabel}>Avg Heart Rate</Text>
                  <Text style={styles.hkBadge}>  Health</Text>
                </View>
                {isReadingHealth && summary.avgHeartRate == null ? (
                  <ActivityIndicator color={theme.primary} size="small" />
                ) : (
                  <Text style={styles.summaryValue}>{summary.avgHeartRate} bpm</Text>
                )}
              </View>
            )}

            {/* If HealthKit returned nothing and we're done, close out the card */}
            {!isReadingHealth && summary.caloriesBurned == null && summary.avgHeartRate == null && (
              <View style={styles.summaryRowLast} />
            )}
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={() => { setSummary(null); setStage('select'); }}
          >
            <Text style={styles.primaryBtnText}>Start Another</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.ghostBtn, { opacity: pressed ? 0.7 : 1 }]}
            onPress={() => router.push('/(member)/workout-history')}
          >
            <Text style={styles.ghostBtnText}>View History</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.ghostBtn, { opacity: pressed ? 0.7 : 1 }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.ghostBtnText, { color: COLORS.textMuted }]}>Back to Dashboard</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: 60,
    paddingBottom: SPACING.md,
  },
  headerTitle: { fontSize: 17, color: COLORS.text, ...FONT.semibold },
  headerSpacer: { width: 40 },
  backBtn: { width: 40, alignItems: 'flex-start' },

  // SELECT
  selectContent: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxl, paddingTop: SPACING.sm },
  selectHeading: { fontSize: 24, color: COLORS.text, ...FONT.bold, marginBottom: SPACING.xs },
  selectSub: { fontSize: 14, color: COLORS.textSecondary, ...FONT.regular, marginBottom: SPACING.xl },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  typeCard: {
    width: '47.5%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  typeCardPressed: { opacity: 0.75 },
  typeIconBubble: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeEmoji: { fontSize: 26 },
  typeLabel: { fontSize: 15, color: COLORS.text, ...FONT.semibold },

  // ACTIVE
  activeWrapper: { flex: 1, alignItems: 'center' },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    marginBottom: SPACING.xxl,
  },
  typeBadgeEmoji: { fontSize: 18 },
  typeBadgeLabel: { fontSize: 14, color: COLORS.textSecondary, ...FONT.medium },
  timerRing: {
    width: 220,
    height: 220,
    borderRadius: 110,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  timerInner: {
    width: 196,
    height: 196,
    borderRadius: 98,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: { fontSize: 44, color: COLORS.text, ...FONT.display, letterSpacing: -1 },
  timerLabel: { fontSize: 13, color: COLORS.textMuted, ...FONT.regular, marginTop: 4 },
  startedAt: { fontSize: 13, color: COLORS.textMuted, ...FONT.regular, marginBottom: SPACING.xxl },
  stopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderWidth: 1.5,
    borderColor: COLORS.error + '60',
    borderRadius: RADIUS.button,
    paddingVertical: 14,
    paddingHorizontal: SPACING.xl,
  },
  stopBtnText: { fontSize: 15, color: COLORS.error, ...FONT.semibold },

  // MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xl,
    width: '100%',
    alignItems: 'center',
  },
  modalEmoji: { fontSize: 40, marginBottom: SPACING.sm },
  modalTitle: { fontSize: 20, color: COLORS.text, ...FONT.bold, marginBottom: SPACING.xs },
  modalBody: {
    fontSize: 14,
    color: COLORS.textSecondary,
    ...FONT.regular,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 22,
  },
  modalPrimaryBtn: {
    width: '100%',
    borderRadius: RADIUS.button,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  modalPrimaryBtnText: { fontSize: 15, color: '#000', ...FONT.bold },
  modalGhostBtn: { paddingVertical: 12 },
  modalGhostBtnText: { fontSize: 14, color: COLORS.textMuted, ...FONT.medium },

  // SUMMARY
  summaryContent: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxl, paddingTop: 60 },
  doneHeader: { alignItems: 'center', marginBottom: SPACING.xl },
  doneCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  doneTitle: { fontSize: 26, color: COLORS.text, ...FONT.bold, marginBottom: SPACING.xs },
  doneSub: { fontSize: 14, color: COLORS.textSecondary, ...FONT.regular },
  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.xl,
    overflow: 'hidden',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 16,
  },
  summaryRowBorder: { borderTopWidth: 1, borderTopColor: COLORS.border },
  summaryRowLast: { borderBottomWidth: 0 },
  summaryLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  summaryLabel: { fontSize: 14, color: COLORS.textSecondary, ...FONT.regular },
  summaryValue: { fontSize: 14, color: COLORS.text, ...FONT.semibold },
  summaryEmoji: { fontSize: 16 },
  hkBadge: {
    fontSize: 10,
    color: COLORS.error,
    ...FONT.semibold,
    backgroundColor: COLORS.error + '18',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  primaryBtn: {
    borderRadius: RADIUS.button,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  primaryBtnText: { fontSize: 15, color: '#000', ...FONT.bold },
  ghostBtn: { paddingVertical: 12, alignItems: 'center' },
  ghostBtnText: { fontSize: 14, color: COLORS.textSecondary, ...FONT.medium },
});
