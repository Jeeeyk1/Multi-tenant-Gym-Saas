import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useWorkout } from '../../context/WorkoutContext';
import { workoutService } from '../../services/workout.service';
import { COLORS, SPACING, RADIUS, FONT } from '../../constants/theme';
import type { WorkoutSession } from '../../types';

const TYPE_META: Record<string, { icon: string; color: string }> = {
  Strength: { icon: '💪', color: '#8B5CF6' },
  Cardio:   { icon: '🏃', color: '#F97316' },
  HIIT:     { icon: '⚡', color: '#EF4444' },
  CrossFit: { icon: '🔥', color: '#F59E0B' },
  Yoga:     { icon: '🧘', color: '#10B981' },
  Other:    { icon: '🏋️', color: '#6B7280' },
};

function startOfWeek(): Date {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function computeStreak(sessions: WorkoutSession[]): number {
  if (!sessions.length) return 0;
  const days = [
    ...new Set(
      sessions.map((s) => {
        const d = new Date(s.startedAt);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      }),
    ),
  ].sort((a, b) => b - a);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();

  // Start streak only if worked out today or yesterday
  if (days[0] !== todayMs && days[0] !== todayMs - 86_400_000) return 0;

  let streak = 1;
  for (let i = 1; i < days.length; i++) {
    if (days[i - 1] - days[i] === 86_400_000) streak++;
    else break;
  }
  return streak;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function relativeDay(iso: string) {
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = today.getTime() - d.getTime();
  if (diff === 0) return 'Today';
  if (diff === 86_400_000) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function TrainScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();
  const { activeSession } = useWorkout();

  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setIsLoading(true);
    try {
      const res = await workoutService.listSessions(user.gymId, 1, 20);
      setSessions(res.data);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(true); };

  const weekStart = startOfWeek();
  const weekSessions = sessions.filter((s) => new Date(s.startedAt) >= weekStart);
  const weekMinutes = weekSessions.reduce((sum, s) => sum + s.durationMinutes, 0);
  const streak = computeStreak(sessions);
  const recentSessions = sessions.slice(0, 3);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.pageTitle}>Train</Text>

      {/* Active session resume banner */}
      {activeSession && (
        <Pressable
          style={({ pressed }) => [styles.resumeCard, pressed && { opacity: 0.85 }]}
          onPress={() => router.push('/(member)/workout')}
        >
          <View style={[styles.resumeDot, { backgroundColor: COLORS.success }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.resumeTitle}>Workout in progress</Text>
            <Text style={styles.resumeSub}>{activeSession.workoutType} · tap to resume</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </Pressable>
      )}

      {/* Weekly stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={[styles.statNum, { color: theme.primary }]}>{weekSessions.length}</Text>
          <Text style={styles.statLabel}>This week</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNum, { color: theme.primary }]}>{weekMinutes}</Text>
          <Text style={styles.statLabel}>Min this week</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNum, { color: theme.primary }]}>{streak}</Text>
          <Text style={styles.statLabel}>Day streak</Text>
        </View>
      </View>

      {/* Start Workout CTA */}
      {!activeSession && (
        <Pressable
          onPress={() => router.push('/(member)/workout')}
          style={({ pressed }) => [styles.startCardWrap, pressed && { opacity: 0.9 }]}
        >
          <LinearGradient
            colors={theme.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.startCard}
          >
            <View style={styles.startCardContent}>
              <View>
                <Text style={styles.startEyebrow}>Ready to train?</Text>
                <Text style={styles.startTitle}>Start Workout</Text>
              </View>
              <View style={styles.startIconBubble}>
                <Ionicons name="barbell" size={28} color="rgba(0,0,0,0.7)" />
              </View>
            </View>
          </LinearGradient>
        </Pressable>
      )}

      {/* Recent sessions */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Sessions</Text>
        {sessions.length > 0 && (
          <Pressable onPress={() => router.push('/(member)/workout-history')}>
            <Text style={[styles.sectionLink, { color: theme.primary }]}>View all</Text>
          </Pressable>
        )}
      </View>

      {recentSessions.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>🏋️</Text>
          <Text style={styles.emptyTitle}>No sessions yet</Text>
          <Text style={styles.emptySub}>Complete your first workout to see it here</Text>
        </View>
      ) : (
        <View style={styles.sessionList}>
          {recentSessions.map((session, idx) => {
            const meta = TYPE_META[session.workoutType] ?? TYPE_META.Other;
            return (
              <View
                key={session.id}
                style={[styles.sessionRow, idx > 0 && styles.sessionRowBorder]}
              >
                <View style={[styles.sessionIconBubble, { backgroundColor: meta.color + '22' }]}>
                  <Text style={styles.sessionEmoji}>{meta.icon}</Text>
                </View>
                <View style={styles.sessionMeta}>
                  <Text style={styles.sessionType}>{session.workoutType}</Text>
                  <Text style={styles.sessionTime}>
                    {relativeDay(session.startedAt)} · {formatTime(session.startedAt)}
                  </Text>
                </View>
                <Text style={[styles.sessionDuration, { color: theme.primary }]}>
                  {session.durationMinutes} min
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* All-time stats */}
      {sessions.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { marginTop: SPACING.xl }]}>All Time</Text>
          <View style={styles.allTimeCard}>
            <View style={styles.allTimeRow}>
              <Text style={styles.allTimeLabel}>Total sessions</Text>
              <Text style={styles.allTimeValue}>{sessions.length}</Text>
            </View>
            <View style={[styles.allTimeRow, styles.allTimeRowBorder]}>
              <Text style={styles.allTimeLabel}>Total minutes</Text>
              <Text style={styles.allTimeValue}>
                {sessions.reduce((sum, s) => sum + s.durationMinutes, 0)}
              </Text>
            </View>
            <View style={[styles.allTimeRow, styles.allTimeRowBorder, { borderBottomWidth: 0 }]}>
              <Text style={styles.allTimeLabel}>Most trained</Text>
              <Text style={styles.allTimeValue}>
                {(() => {
                  const counts: Record<string, number> = {};
                  sessions.forEach((s) => { counts[s.workoutType] = (counts[s.workoutType] ?? 0) + 1; });
                  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
                })()}
              </Text>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  centered: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },

  pageTitle: { fontSize: 28, color: COLORS.text, ...FONT.bold, marginBottom: SPACING.lg },

  // Resume banner
  resumeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.success + '50',
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    marginBottom: SPACING.md,
  },
  resumeDot: { width: 10, height: 10, borderRadius: 5 },
  resumeTitle: { fontSize: 14, color: COLORS.text, ...FONT.semibold },
  resumeSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  // Stats
  statsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    gap: 4,
  },
  statNum: { fontSize: 22, ...FONT.bold },
  statLabel: { fontSize: 11, color: COLORS.textMuted, ...FONT.regular, textAlign: 'center' },

  // Start card
  startCardWrap: { marginBottom: SPACING.xl },
  startCard: { borderRadius: RADIUS.xl, padding: SPACING.lg },
  startCardContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  startEyebrow: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.6)',
    ...FONT.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  startTitle: { fontSize: 22, color: '#000', ...FONT.bold },
  startIconBubble: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Section
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    ...FONT.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionLink: { fontSize: 13, ...FONT.semibold },

  // Session list
  sessionList: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    gap: SPACING.sm,
  },
  sessionRowBorder: { borderTopWidth: 1, borderTopColor: COLORS.border },
  sessionIconBubble: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionEmoji: { fontSize: 18 },
  sessionMeta: { flex: 1 },
  sessionType: { fontSize: 14, color: COLORS.text, ...FONT.semibold },
  sessionTime: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  sessionDuration: { fontSize: 14, ...FONT.bold },

  // Empty state
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  emptyEmoji: { fontSize: 36, marginBottom: 4 },
  emptyTitle: { fontSize: 16, color: COLORS.text, ...FONT.semibold },
  emptySub: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },

  // All time
  allTimeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  allTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
  },
  allTimeRowBorder: { borderTopWidth: 1, borderTopColor: COLORS.border },
  allTimeLabel: { fontSize: 14, color: COLORS.textSecondary, ...FONT.regular },
  allTimeValue: { fontSize: 14, color: COLORS.text, ...FONT.semibold },
});
