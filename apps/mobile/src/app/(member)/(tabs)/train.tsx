import React, { useCallback, useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, ScrollView, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { Text } from '../../../components/Text';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '../../../context/ThemeContext';
import { AppLoader } from '../../../components/AppLoader';
import { PressableScale } from '../../../components/ui';
import { useWorkout } from '../../../context/WorkoutContext';
import { useWorkoutSessions, useWorkoutSummary } from '../../../hooks/workouts';
import { countDayStreak } from '../../../lib/day-streak';
import { SPACING, RADIUS, FONT } from '../../../constants/theme';
import { workoutTypeMeta, DEFAULT_WORKOUT_ICON, DEFAULT_WORKOUT_COLOR } from '../../../constants/workout-types';
import type { WorkoutSession } from '../../../types';

function startOfWeek(): Date {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
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
  // Tab screens hide the header, so keep content clear of the notch / status bar.
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const C = theme.colors;
  const { activeSession } = useWorkout();

  const sessionsQ = useWorkoutSessions(20);
  const summaryQ = useWorkoutSummary();
  const summary = summaryQ.data;
  const sessions: WorkoutSession[] = sessionsQ.data?.pages[0]?.data ?? [];
  const isLoading = sessionsQ.isLoading;
  const refreshing = sessionsQ.isRefetching;

  // Depend on the stable `refetch` — not the whole query object, whose identity changes every
  // render. Depending on `sessionsQ` made the callback new each render, so useFocusEffect re-ran
  // it on every render while focused, and each refetch re-rendered → an unbounded request loop.
  const { refetch: refetchSessions } = sessionsQ;
  const { refetch: refetchSummary } = summaryQ;
  useFocusEffect(useCallback(() => { refetchSessions(); refetchSummary(); }, [refetchSessions, refetchSummary]));

  const weekStart = startOfWeek();
  const weekSessions = sessions.filter((s) => new Date(s.startedAt) >= weekStart);
  const weekMinutes = weekSessions.reduce((sum, s) => sum + s.durationMinutes, 0);
  // Workout days in a row (different from the check-in streak on Home, so it's labelled "Workout streak").
  const streak = countDayStreak(sessions.map((ss) => ss.startedAt));
  const recentSessions = sessions.slice(0, 3);

  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    content: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
    centered: { flex: 1, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center' },
    pageTitle: { fontSize: 28, lineHeight: 34, color: C.text, ...FONT.bold, marginBottom: SPACING.lg },
    resumeCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      backgroundColor: C.surface,
      borderRadius: RADIUS.xl,
      borderWidth: 1,
      borderColor: C.success + '50',
      paddingHorizontal: SPACING.md,
      paddingVertical: 14,
      marginBottom: SPACING.md,
    },
    linkCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm + 4,
      backgroundColor: C.surface,
      borderRadius: RADIUS.xl,
      borderWidth: 1,
      borderColor: C.border,
      paddingHorizontal: SPACING.md,
      paddingVertical: 14,
      marginBottom: SPACING.lg,
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
      color: theme.onPrimary,
      ...FONT.semibold,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: 4,
    },
    startTitle: { fontSize: 22, color: theme.onPrimary, ...FONT.bold },
    startIconBubble: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.onPrimary + '1F',
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
    emptyIcon: { marginBottom: 4 },
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
  }), [C, theme.onPrimary]);

  if (isLoading) {
    return (
      <View style={s.centered}>
        <AppLoader />
      </View>
    );
  }

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={[s.content, { paddingTop: insets.top + SPACING.sm }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { sessionsQ.refetch(); summaryQ.refetch(); }} tintColor={theme.primary} />
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
          <Text style={[s.statNum, { color: theme.accentText }]}>{weekSessions.length}</Text>
          <Text style={s.statLabel}>This week</Text>
        </View>
        <View style={s.statCard}>
          <Text style={[s.statNum, { color: theme.accentText }]}>{weekMinutes}</Text>
          <Text style={s.statLabel}>Minutes</Text>
        </View>
        <View style={s.statCard}>
          <Text style={[s.statNum, { color: theme.accentText }]}>{streak}</Text>
          <Text style={s.statLabel}>Workout streak</Text>
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
                <Ionicons name="barbell" size={28} color={theme.onPrimary} />
              </View>
            </View>
          </LinearGradient>
        </Pressable>
      )}

      <PressableScale
        onPress={() => router.push('/(member)/leaderboard')}
        style={s.linkCard}
        accessibilityRole="button"
        accessibilityLabel="Leaderboard"
      >
        <Ionicons name="trophy-outline" size={22} color={theme.accentText} />
        <View style={{ flex: 1 }}>
          <Text style={s.resumeTitle}>Leaderboard</Text>
          <Text style={s.resumeSub}>See where you rank on each lift</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
      </PressableScale>

      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>Recent Sessions</Text>
        {sessions.length > 0 && (
          <Pressable onPress={() => router.push('/(member)/workout-history')}>
            <Text style={[s.sectionLink, { color: theme.accentText }]}>View all</Text>
          </Pressable>
        )}
      </View>

      {recentSessions.length === 0 ? (
        <View style={s.emptyCard}>
          <Ionicons name="barbell-outline" size={36} color={C.textMuted} style={s.emptyIcon} />
          <Text style={s.emptyTitle}>No sessions yet</Text>
          <Text style={s.emptySub}>Complete your first workout to see it here</Text>
        </View>
      ) : (
        <View style={s.sessionList}>
          {recentSessions.map((session, idx) => {
            const meta = workoutTypeMeta(session.workoutType);
            const iconColor = meta?.color ?? DEFAULT_WORKOUT_COLOR;
            return (
              <View
                key={session.id}
                style={[s.sessionRow, idx > 0 && s.sessionRowBorder]}
              >
                <View style={[s.sessionIconBubble, { backgroundColor: iconColor + '22' }]}>
                  <Ionicons name={meta?.icon ?? DEFAULT_WORKOUT_ICON} size={18} color={iconColor} />
                </View>
                <View style={s.sessionMeta}>
                  <Text style={s.sessionType}>{session.workoutType}</Text>
                  <Text style={s.sessionTime}>
                    {relativeDay(session.startedAt)} · {formatTime(session.startedAt)}
                  </Text>
                </View>
                <Text style={[s.sessionDuration, { color: theme.accentText }]}>
                  {session.durationMinutes} min
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {summary && summary.totalSessions > 0 && (
        <>
          <View style={[s.sectionHeader, { marginTop: SPACING.xl }]}>
            <Text style={s.sectionTitle}>All Time</Text>
          </View>
          <View style={s.allTimeCard}>
            <View style={s.allTimeRow}>
              <Text style={s.allTimeLabel}>Total sessions</Text>
              <Text style={s.allTimeValue}>{summary.totalSessions}</Text>
            </View>
            <View style={[s.allTimeRow, s.allTimeRowBorder]}>
              <Text style={s.allTimeLabel}>Total minutes</Text>
              <Text style={s.allTimeValue}>{summary.totalMinutes}</Text>
            </View>
            <View style={[s.allTimeRow, s.allTimeRowBorder, { borderBottomWidth: 0 }]}>
              <Text style={s.allTimeLabel}>Most trained</Text>
              <Text style={s.allTimeValue}>{summary.mostTrainedType ?? '—'}</Text>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}
