import React, { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
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

function typeIcon(workoutType: string) {
  return TYPE_META[workoutType]?.icon ?? '🏋️';
}

function typeColor(workoutType: string) {
  return TYPE_META[workoutType]?.color ?? COLORS.textMuted;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function groupByDay(sessions: WorkoutSession[]): { label: string; items: WorkoutSession[] }[] {
  const map = new Map<string, WorkoutSession[]>();
  for (const s of sessions) {
    const key = new Date(s.startedAt).toDateString();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }
  return Array.from(map.entries()).map(([key, items]) => ({
    label: formatDate(items[0].startedAt),
    items,
  }));
}

const PAGE_SIZE = 20;

export default function WorkoutHistoryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();

  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (pageNum: number, replace: boolean) => {
    if (!user) return;
    try {
      const res = await workoutService.listSessions(user.gymId, pageNum, PAGE_SIZE);
      setSessions((prev) => replace ? res.data : [...prev, ...res.data]);
      setTotalPages(res.meta.totalPages);
      setPage(pageNum);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { load(1, true); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(1, true); };

  const loadMore = () => {
    if (isLoadingMore || page >= totalPages) return;
    setIsLoadingMore(true);
    load(page + 1, false);
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  const groups = groupByDay(sessions);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Workout History</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {sessions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🏋️</Text>
            <Text style={styles.emptyTitle}>No sessions yet</Text>
            <Text style={styles.emptySub}>Start a workout to see your history here</Text>
            <Pressable
              style={[styles.emptyBtn, { backgroundColor: theme.primary }]}
              onPress={() => router.replace('/(member)/workout')}
            >
              <Text style={styles.emptyBtnText}>Start Workout</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Summary strip */}
            <View style={styles.summaryStrip}>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryNum, { color: theme.primary }]}>{sessions.length}</Text>
                <Text style={styles.summaryLabel}>Sessions</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryNum, { color: theme.primary }]}>
                  {sessions.reduce((acc, s) => acc + s.durationMinutes, 0)}
                </Text>
                <Text style={styles.summaryLabel}>Total min</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryNum, { color: theme.primary }]}>
                  {Math.round(sessions.reduce((acc, s) => acc + s.durationMinutes, 0) / sessions.length)}
                </Text>
                <Text style={styles.summaryLabel}>Avg min</Text>
              </View>
            </View>

            {groups.map((group) => (
              <View key={group.label} style={styles.group}>
                <Text style={styles.groupLabel}>{group.label}</Text>
                <View style={styles.groupCard}>
                  {group.items.map((session, idx) => (
                    <View
                      key={session.id}
                      style={[styles.sessionRow, idx > 0 && styles.sessionRowBorder]}
                    >
                      <View
                        style={[
                          styles.typeIconBubble,
                          { backgroundColor: typeColor(session.workoutType) + '22' },
                        ]}
                      >
                        <Text style={styles.typeEmoji}>{typeIcon(session.workoutType)}</Text>
                      </View>

                      <View style={styles.sessionMeta}>
                        <Text style={styles.sessionType}>{session.workoutType}</Text>
                        <Text style={styles.sessionTime}>
                          {formatTime(session.startedAt)} — {formatTime(session.endedAt)}
                        </Text>
                      </View>

                      <View style={styles.sessionRight}>
                        <Text style={[styles.sessionDuration, { color: theme.primary }]}>
                          {session.durationMinutes} min
                        </Text>
                        {session.caloriesBurned != null && (
                          <Text style={styles.sessionCalories}>
                            {session.caloriesBurned} kcal
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ))}

            {/* Load more */}
            {page < totalPages && (
              <Pressable
                style={({ pressed }) => [styles.loadMoreBtn, pressed && { opacity: 0.7 }]}
                onPress={loadMore}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? (
                  <ActivityIndicator color={theme.primary} size="small" />
                ) : (
                  <Text style={[styles.loadMoreText, { color: theme.primary }]}>Load more</Text>
                )}
              </Pressable>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },

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

  content: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxl, paddingTop: SPACING.xs },

  // Summary strip
  summaryStrip: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.xl,
    overflow: 'hidden',
  },
  summaryItem: { flex: 1, alignItems: 'center', paddingVertical: SPACING.md },
  summaryNum: { fontSize: 22, ...FONT.bold },
  summaryLabel: { fontSize: 11, color: COLORS.textMuted, ...FONT.regular, marginTop: 2 },
  summaryDivider: { width: 1, backgroundColor: COLORS.border, marginVertical: SPACING.sm },

  // Groups
  group: { marginBottom: SPACING.lg },
  groupLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    ...FONT.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: SPACING.sm,
  },
  groupCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    gap: SPACING.sm,
  },
  sessionRowBorder: { borderTopWidth: 1, borderTopColor: COLORS.border },
  typeIconBubble: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  typeEmoji: { fontSize: 20 },
  sessionMeta: { flex: 1 },
  sessionType: { fontSize: 14, color: COLORS.text, ...FONT.semibold },
  sessionTime: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  sessionRight: { alignItems: 'flex-end' },
  sessionDuration: { fontSize: 14, ...FONT.bold },
  sessionCalories: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },

  // Load more
  loadMoreBtn: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.button,
    marginTop: SPACING.sm,
  },
  loadMoreText: { fontSize: 14, ...FONT.semibold },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingTop: SPACING.xxl * 2,
    gap: SPACING.sm,
  },
  emptyEmoji: { fontSize: 52, marginBottom: SPACING.sm },
  emptyTitle: { fontSize: 20, color: COLORS.text, ...FONT.bold },
  emptySub: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: SPACING.md },
  emptyBtn: {
    borderRadius: RADIUS.button,
    paddingVertical: 14,
    paddingHorizontal: SPACING.xl,
  },
  emptyBtnText: { fontSize: 15, color: '#000', ...FONT.bold },
});
