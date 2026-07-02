import React, { useCallback, useMemo } from 'react';
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
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useWorkout } from '../../context/WorkoutContext';
import { useWorkoutSessions } from '../../hooks/workouts';
import { SPACING, RADIUS, FONT } from '../../constants/theme';
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
  const { theme } = useTheme();
  const C = theme.colors;
  const { activeSession } = useWorkout();

  const sessionsQ = useWorkoutSessions(20);
  const sessions: WorkoutSession[] = sessionsQ.data?.pages[0]?.data ?? [];
  const isLoading = sessionsQ.isLoading;
  const refreshing = sessionsQ.isRefetching;

  useFocusEffect(useCallback(() => { sessionsQ.refetch(); }, [sessionsQ]));

  const weekStart = startOfWeek();
  const weekSessions = sessions.filter((s) => new Date(s.startedAt) >= weekStart);
  const weekMinutes = weekSessions.reduce((sum, s) => sum + s.durationMinutes, 0);
  const streak = computeStreak(sessions);
  const recentSessions = sessions.slice(0, 3);

  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    content: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
    centered: { flex: 1, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center' },
    pageTitle: { fontSize: 28, color: C.text, ...FONT.bold, marginBottom: SPACING.lg },
    resumeCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      backgroundColor: C.surface,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: C.success + '50',
      paddingHorizontal: SPACING.md,
      paddingVertical: 14,
      marginBottom: SPACING.md,
    },
    resumeTitle: { fontSize: 14, color: C.text, ...FONT.semibold },
    resumeSub: { fontSize: 12, color: C.textSecondary, marginTop: 2 },
    statsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
    statCard: {
      flex: 1,
      backgroundColor: C.surface,
      borderRadius: RADIUS.xl,
      borderWidth: 1,
      borderColor: C.border,
      paddingVertical: SPACING.md,
      alignItems: 'center',
      gap: 4,
    },
    statNum: { fontSize: 22, ...FONT.bold },
    statLabel: { fontSize: 11, color: C.textMuted, ...FONT.regular, textAlign: 'center' },
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
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.sm,
    },
    sectionTitle: {
      fontSize: 12,
      color: C.textMuted,
      ...FONT.semibold,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    sectionLink: { fontSize: 13, ...FONT.semibold },
    sessionList: {
      backgroundColor: C.surface,
      borderRadius: RADIUS.xl,
      borderWidth: 1,
      borderColor: C.border,
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
    sessionRowBorder: { borderTopWidth: 1, borderTopColor: C.border },
    sessionIconBubble: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sessionEmoji: { fontSize: 18 },
    sessionMeta: { flex: 1 },
    sessionType: { fontSize: 14, color: C.text, ...FONT.semibold },
    sessionTime: { fontSize: 12, color: C.textSecondary, marginTop: 2 },
    sessionDuration: { fontSize: 14, ...FONT.bold },
    emptyCard: {
      backgroundColor: C.surface,
      borderRadius: RADIUS.xl,
      borderWidth: 1,
      borderColor: C.border,
      padding: SPACING.xl,
      alignItems: 'center',
      gap: SPACING.xs,
      marginBottom: SPACING.sm,
    },
    emptyEmoji: { fontSize: 36, marginBottom: 4 },
    emptyTitle: { fontSize: 16, color: C.text, ...FONT.semibold },
    emptySub: { fontSize: 13, color: C.textSecondary, textAlign: 'center' },
    allTimeCard: {
      backgroundColor: C.surface,
      borderRadius: RADIUS.xl,
      borderWidth: 1,
      borderColor: C.border,
      overflow: 'hidden',
    },
    allTimeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.md,
      paddingVertical: 14,
    },
    allTimeRowBorder: { borderTopWidth: 1, borderTopColor: C.border },
    allTimeLabel: { fontSize: 14, color: C.textSecondary, ...FONT.regular },
    allTimeValue: { fontSize: 14, color: C.text, ...FONT.semibold },
  }), [C]);

  if (isLoading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => sessionsQ.refetch()} tintColor={theme.primary} />
      }
      showsVerticalScrollIndicator={false}
    >
      <Text style={s.pageTitle}>Train</Text>

      {activeSession && (
        <Pressable
          style={({ pressed }) => [s.resumeCard, pressed && { opacity: 0.85 }]}
          onPress={() => router.push('/(member)/workout')}
        >
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.success }} />
          <View style={{ flex: 1 }}>
            <Text style={s.resumeTitle}>Workout in progress</Text>
            <Text style={s.resumeSub}>{activeSession.workoutType} · tap to resume</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
        </Pressable>
      )}

      <View style={s.statsRow}>
        <View style={s.statCard}>
          <Text style={[s.statNum, { color: theme.primary }]}>{weekSessions.length}</Text>
          <Text style={s.statLabel}>This week</Text>
        </View>
        <View style={s.statCard}>
          <Text style={[s.statNum, { color: theme.primary }]}>{weekMinutes}</Text>
          <Text style={s.statLabel}>Minutes</Text>
        </View>
        <View style={s.statCard}>
          <Text style={[s.statNum, { color: theme.primary }]}>{streak}</Text>
          <Text style={s.statLabel}>Day streak</Text>
        </View>
      </View>

      {!activeSession && (
        <Pressable
          onPress={() => router.push('/(member)/workout')}
          style={({ pressed }) => [s.startCardWrap, pressed && { opacity: 0.9 }]}
        >
          <LinearGradient
            colors={theme.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.startCard}
          >
            <View style={s.startCardContent}>
              <View>
                <Text style={s.startEyebrow}>Ready to train?</Text>
                <Text style={s.startTitle}>Start Workout</Text>
              </View>
              <View style={s.startIconBubble}>
                <Ionicons name="barbell" size={28} color="rgba(0,0,0,0.7)" />
              </View>
            </View>
          </LinearGradient>
        </Pressable>
      )}

      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>Recent Sessions</Text>
        {sessions.length > 0 && (
          <Pressable onPress={() => router.push('/(member)/workout-history')}>
            <Text style={[s.sectionLink, { color: theme.primary }]}>View all</Text>
          </Pressable>
        )}
      </View>

      {recentSessions.length === 0 ? (
        <View style={s.emptyCard}>
          <Text style={s.emptyEmoji}>🏋️</Text>
          <Text style={s.emptyTitle}>No sessions yet</Text>
          <Text style={s.emptySub}>Complete your first workout to see it here</Text>
        </View>
      ) : (
        <View style={s.sessionList}>
          {recentSessions.map((session, idx) => {
            const meta = TYPE_META[session.workoutType] ?? TYPE_META.Other;
            return (
              <View
                key={session.id}
                style={[s.sessionRow, idx > 0 && s.sessionRowBorder]}
              >
                <View style={[s.sessionIconBubble, { backgroundColor: meta.color + '22' }]}>
                  <Text style={s.sessionEmoji}>{meta.icon}</Text>
                </View>
                <View style={s.sessionMeta}>
                  <Text style={s.sessionType}>{session.workoutType}</Text>
                  <Text style={s.sessionTime}>
                    {relativeDay(session.startedAt)} · {formatTime(session.startedAt)}
                  </Text>
                </View>
                <Text style={[s.sessionDuration, { color: theme.primary }]}>
                  {session.durationMinutes} min
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {sessions.length > 0 && (
        <>
          <View style={[s.sectionHeader, { marginTop: SPACING.xl }]}>
            <Text style={s.sectionTitle}>All Time</Text>
          </View>
          <View style={s.allTimeCard}>
            <View style={s.allTimeRow}>
              <Text style={s.allTimeLabel}>Total sessions</Text>
              <Text style={s.allTimeValue}>{sessions.length}</Text>
            </View>
            <View style={[s.allTimeRow, s.allTimeRowBorder]}>
              <Text style={s.allTimeLabel}>Total minutes</Text>
              <Text style={s.allTimeValue}>
                {sessions.reduce((sum, ss) => sum + ss.durationMinutes, 0)}
              </Text>
            </View>
            <View style={[s.allTimeRow, s.allTimeRowBorder, { borderBottomWidth: 0 }]}>
              <Text style={s.allTimeLabel}>Most trained</Text>
              <Text style={s.allTimeValue}>
                {(() => {
                  const counts: Record<string, number> = {};
                  sessions.forEach((ss) => { counts[ss.workoutType] = (counts[ss.workoutType] ?? 0) + 1; });
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
