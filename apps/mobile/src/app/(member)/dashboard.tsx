import React, { useMemo } from 'react';
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
import { useActivePublicCheckins, useMyMember, useMyCheckIns } from '../../hooks/members';
import { GreetingBanner } from '../../components/GreetingBanner';
import { MembershipCard } from '../../components/MembershipCard';
import { useWorkout } from '../../context/WorkoutContext';
import { SPACING, RADIUS, FONT } from '../../constants/theme';
import type { CheckIn } from '../../types';

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

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();
  const C = theme.colors;
  const { activeSession } = useWorkout();

  const memberQ = useMyMember();
  const checkInsQ = useMyCheckIns(7);
  const whosHereQ = useActivePublicCheckins();

  const isLoading = memberQ.isLoading || checkInsQ.isLoading;
  const refreshing = memberQ.isRefetching || checkInsQ.isRefetching;
  const errorMessage =
    (memberQ.error as { message?: string } | null)?.message ??
    (checkInsQ.error as { message?: string } | null)?.message ??
    null;
  const member = memberQ.data ?? null;
  const checkIns: CheckIn[] = checkInsQ.data ?? [];

  function handleRefresh() {
    memberQ.refetch();
    checkInsQ.refetch();
  }

  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    content: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
    centered: { flex: 1, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center' },
    errorBox: {
      backgroundColor: C.errorBg,
      borderWidth: 1,
      borderColor: C.error,
      borderRadius: RADIUS.md,
      padding: SPACING.md,
      marginBottom: SPACING.md,
    },
    errorText: { color: C.error, fontSize: 13 },
    sectionLabel: {
      fontSize: 12,
      ...FONT.semibold,
      color: C.textMuted,
      marginBottom: SPACING.sm,
      marginTop: SPACING.sm,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    // Who's here card
    whosHereCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      backgroundColor: C.surface,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: C.border,
      paddingHorizontal: SPACING.md,
      paddingVertical: 14,
      marginBottom: SPACING.md,
    },
    whosHereTitle: { fontSize: 14, color: C.text, ...FONT.semibold },
    whosHereSub: { fontSize: 12, color: C.textSecondary, marginTop: 2 },
    // Resume banner
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
    // Quick actions
    quickActions: {
      flexDirection: 'row',
      gap: SPACING.sm,
      marginBottom: SPACING.md,
    },
    quickActionBtn: {
      flex: 1,
      backgroundColor: C.surface,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: C.border,
      paddingVertical: SPACING.md,
      alignItems: 'center',
      gap: SPACING.xs,
    },
    quickActionLabel: { fontSize: 13, color: C.text, ...FONT.semibold },
    // Recent visits
    emptyCard: {
      backgroundColor: C.surface,
      borderRadius: RADIUS.lg,
      padding: SPACING.lg,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: C.border,
    },
    emptyText: { color: C.textSecondary, fontSize: 14 },
    checkInList: {
      backgroundColor: C.surface,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: C.border,
      overflow: 'hidden',
    },
    checkInRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: SPACING.md,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    checkInDate: { fontSize: 14, color: C.text, ...FONT.medium },
    checkInTime: { fontSize: 12, color: C.textSecondary, marginTop: 2 },
    checkInDuration: { fontSize: 13, color: C.textMuted, ...FONT.regular },
  }), [C]);

  if (isLoading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  const { streak, lastCheckInToday } = computeStreak(checkIns);
  const firstName = user?.fullName?.split(' ')[0] ?? 'Member';
  const initials = user?.fullName ? getInitials(user.fullName) : '?';

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />
      }
      showsVerticalScrollIndicator={false}
    >
      <GreetingBanner
        name={firstName}
        initials={initials}
        streak={streak}
        lastCheckInToday={lastCheckInToday}
      />

      {errorMessage && (
        <View style={s.errorBox}>
          <Text style={s.errorText}>{errorMessage}</Text>
        </View>
      )}

      {member && <MembershipCard member={member} />}

      {/* Who's here */}
      {whosHereQ.data && (
        <Pressable
          onPress={() => router.push('/(member)/whos-here')}
          style={({ pressed }) => [s.whosHereCard, pressed && { opacity: 0.85 }]}
        >
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.success }} />
          <View style={{ flex: 1 }}>
            <Text style={s.whosHereTitle}>
              {whosHereQ.data.totalCount === 0
                ? 'No one is here right now'
                : whosHereQ.data.totalCount === 1
                  ? '1 member is here right now'
                  : `${whosHereQ.data.totalCount} members are here right now`}
            </Text>
            <Text style={s.whosHereSub}>
              Tap to see who&apos;s in &amp; set your visibility
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
        </Pressable>
      )}

      {/* Active workout resume */}
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

      {/* Quick actions */}
      <View style={s.quickActions}>
        <Pressable
          style={({ pressed }) => [s.quickActionBtn, pressed && { opacity: 0.8 }]}
          onPress={() => router.push('/(member)/checkin')}
        >
          <Ionicons name="scan-outline" size={24} color={theme.primary} />
          <Text style={s.quickActionLabel}>Check In</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [s.quickActionBtn, pressed && { opacity: 0.8 }]}
          onPress={() => router.push('/(member)/workout')}
        >
          <Ionicons name="barbell-outline" size={24} color={theme.primary} />
          <Text style={s.quickActionLabel}>Start Workout</Text>
        </Pressable>
      </View>

      {/* Recent visits */}
      <Text style={s.sectionLabel}>Recent Visits</Text>
      {checkIns.length === 0 ? (
        <View style={s.emptyCard}>
          <Text style={s.emptyText}>No visits yet. Come say hi!</Text>
        </View>
      ) : (
        <View style={s.checkInList}>
          {checkIns.slice(0, 5).map((ci) => {
            const dateObj = new Date(ci.checkedInAt);
            const duration = ci.checkedOutAt
              ? Math.round((new Date(ci.checkedOutAt).getTime() - dateObj.getTime()) / 60000)
              : null;
            return (
              <View key={ci.id} style={s.checkInRow}>
                <View>
                  <Text style={s.checkInDate}>
                    {dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </Text>
                  <Text style={s.checkInTime}>
                    Checked in · {dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                {duration != null && (
                  <Text style={s.checkInDuration}>{duration} min</Text>
                )}
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}
