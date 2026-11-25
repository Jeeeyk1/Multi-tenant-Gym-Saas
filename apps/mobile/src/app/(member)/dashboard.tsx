import React, { useMemo } from 'react';
import { View, ScrollView, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { Text } from '../../components/Text';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { AppLoader } from '../../components/AppLoader';
import { useActivePublicCheckins, useMyMember, useMyCheckIns, useMyProfile } from '../../hooks/members';
import { useCurrentFitnessPlan, useDailyNutrition } from '../../hooks/fitness-plan';
import { TodayCard } from '../../components/dashboard/TodayCard';
import { SetupPlanCard } from '../../components/dashboard/SetupPlanCard';
import { WeightCard } from '../../components/dashboard/WeightCard';
import { UnitSystem } from '../../constants/enums';
import { GreetingBanner } from '../../components/GreetingBanner';
import { NewBadgeCelebration } from '../../components/badges/NewBadgeCelebration';
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

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();
  const C = theme.colors;
  const { activeSession } = useWorkout();
  // The tab screens hide the header, so keep content clear of the notch / status bar.
  const insets = useSafeAreaInsets();

  const memberQ = useMyMember();
  const checkInsQ = useMyCheckIns(7);
  const whosHereQ = useActivePublicCheckins();
  const planQ = useCurrentFitnessPlan();
  const dailyQ = useDailyNutrition();
  const profileQ = useMyProfile();

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
    planQ.refetch();
    dailyQ.refetch();
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
    // AI Coach card
    aiCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.md,
      borderRadius: RADIUS.lg,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.md,
    },
    aiIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.12)',
    },
    aiTitle: { fontSize: 16, color: '#000', ...FONT.bold },
    aiSub: { fontSize: 12, color: 'rgba(0,0,0,0.72)', marginTop: 2, ...FONT.medium },
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
        <AppLoader />
      </View>
    );
  }

  const { streak, lastCheckInToday } = computeStreak(checkIns);
  // A restored session's token has no name, so fall back to the member record.
  const firstName = (user?.fullName || member?.user?.fullName || '').split(' ')[0] || 'there';

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={[s.content, { paddingTop: insets.top + SPACING.sm }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />
      }
      showsVerticalScrollIndicator={false}
    >
      <GreetingBanner
        name={firstName}
        streak={streak}
        lastCheckInToday={lastCheckInToday}
        kcalLeft={dailyQ.data?.remaining?.kcal ?? null}
      />

      {errorMessage && (
        <View style={s.errorBox}>
          <Text style={s.errorText}>{errorMessage}</Text>
        </View>
      )}

      {/* Daily plan: set it up, or track today against it */}
      {planQ.data === null && (
        <SetupPlanCard
          title="Set up your plan"
          subtitle="One minute to get your daily calorie and protein targets."
          onPress={() => router.push('/onboarding')}
        />
      )}
      {dailyQ.data?.targets && (
        <TodayCard data={dailyQ.data} onPress={() => router.push('/(member)/nutrition')} />
      )}
      {planQ.data && (
        <WeightCard
          plan={planQ.data}
          imperial={profileQ.data?.unitSystem === UnitSystem.IMPERIAL}
          onGoalReached={() => router.push('/onboarding')}
        />
      )}

      {member && <MembershipCard member={member} />}

      {/* AI Coach — headline feature, kept prominent so members discover it */}
      <Pressable
        onPress={() => router.push('/(member)/ai')}
        style={({ pressed }) => [{ marginBottom: SPACING.md }, pressed && { opacity: 0.9 }]}
      >
        <LinearGradient
          colors={theme.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.aiCard}
        >
          <View style={s.aiIconWrap}>
            <Ionicons name="sparkles" size={22} color="#000" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.aiTitle}>AI Coach</Text>
            <Text style={s.aiSub}>Personalised workouts, meal plans &amp; form tips</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#000" />
        </LinearGradient>
      </Pressable>

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
        <Pressable
          style={({ pressed }) => [s.quickActionBtn, pressed && { opacity: 0.8 }]}
          onPress={() => router.push('/(member)/nutrition')}
        >
          <Ionicons name="restaurant-outline" size={24} color={theme.primary} />
          <Text style={s.quickActionLabel}>Log Meal</Text>
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

      <NewBadgeCelebration />
    </ScrollView>
  );
}
