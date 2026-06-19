import React, { useState, useEffect, useCallback } from 'react';
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
import { memberService } from '../../services/member.service';
import { GreetingBanner } from '../../components/GreetingBanner';
import { MembershipCard } from '../../components/MembershipCard';
import { useWorkout } from '../../context/WorkoutContext';
import { COLORS, SPACING, RADIUS, FONT } from '../../constants/theme';
import type { GymMember, CheckIn } from '../../types';

function computeStreak(checkIns: CheckIn[]): { streak: number; lastCheckInToday: boolean } {
  if (!checkIns.length) return { streak: 0, lastCheckInToday: false };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dates = checkIns
    .map((c) => { const d = new Date(c.checkedInAt); d.setHours(0, 0, 0, 0); return d.getTime(); })
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort((a, b) => b - a);
  const lastCheckInToday = dates[0] === today.getTime();
  let streak = lastCheckInToday ? 1 : 0;
  let prev = today.getTime();
  for (let i = lastCheckInToday ? 1 : 0; i < dates.length; i++) {
    if (prev - dates[i] === 86400000) { streak++; prev = dates[i]; } else break;
  }
  return { streak, lastCheckInToday };
}

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();
  const { activeSession } = useWorkout();
  const [member, setMember] = useState<GymMember | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [m, ci] = await Promise.all([
        memberService.getMyMember(user.gymId),
        memberService.getMyCheckIns(user.gymId, 7),
      ]);
      setMember(m);
      setCheckIns(ci);
      setError(null);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message ?? 'Failed to load your data');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  const { streak, lastCheckInToday } = computeStreak(checkIns);
  const firstName = user?.fullName?.split(' ')[0] ?? 'Member';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load(); }}
          tintColor={theme.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <GreetingBanner name={firstName} streak={streak} lastCheckInToday={lastCheckInToday} />

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {member && <MembershipCard member={member} />}

      {/* Active workout resume banner */}
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

      {/* Recent Check-ins */}
      <Text style={styles.sectionTitle}>Recent Visits</Text>
      {checkIns.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No visits yet. Come say hi!</Text>
        </View>
      ) : (
        <View style={styles.checkInList}>
          {checkIns.slice(0, 5).map((ci) => {
            const dateObj = new Date(ci.checkedInAt);
            const duration = ci.checkedOutAt
              ? Math.round((new Date(ci.checkedOutAt).getTime() - dateObj.getTime()) / 60000)
              : null;
            return (
              <View key={ci.id} style={styles.checkInRow}>
                <View>
                  <Text style={styles.checkInDate}>
                    {dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </Text>
                  <Text style={styles.checkInTime}>
                    {dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                {duration != null && (
                  <Text style={styles.checkInDuration}>{duration} min</Text>
                )}
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  centered: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },

  errorBox: {
    backgroundColor: COLORS.errorBg,
    borderWidth: 1,
    borderColor: COLORS.error,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  errorText: { color: COLORS.error, fontSize: 13 },

  sectionTitle: {
    fontSize: 13,
    ...FONT.semibold,
    color: COLORS.textMuted,
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

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

  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyText: { color: COLORS.textSecondary, fontSize: 14 },

  checkInList: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  checkInRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  checkInDate: { fontSize: 14, color: COLORS.text, ...FONT.medium },
  checkInTime: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  checkInDuration: { fontSize: 13, color: COLORS.textMuted, ...FONT.regular },
});
