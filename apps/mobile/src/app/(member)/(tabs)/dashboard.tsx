import React from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Text } from '../../../components/Text';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { useActivePublicCheckins, useMyCheckinStreak, useMyMember, useMyCheckIns, useMyProfile } from '../../../hooks/members';
import { useCurrentFitnessPlan, useDailyNutrition } from '../../../hooks/fitness-plan';
import { TodayCard } from '../../../components/dashboard/TodayCard';
import { SetupPlanCard } from '../../../components/dashboard/SetupPlanCard';
import { WeightCard } from '../../../components/dashboard/WeightCard';
import { MemberStatus, UnitSystem } from '../../../constants/enums';
import { GreetingBanner } from '../../../components/GreetingBanner';
import { NewBadgeCelebration } from '../../../components/badges/NewBadgeCelebration';
import { MembershipCard } from '../../../components/MembershipCard';
import { ElapsedTime } from '../../../components/checkin/ElapsedTime';
import { Button, EmptyState, PressableScale, Skeleton } from '../../../components/ui';
import { useWorkout } from '../../../context/WorkoutContext';
import { SPACING, RADIUS, FONT } from '../../../constants/theme';
import type { CheckIn, GymMember } from '../../../types';
import { isToday } from '../../../lib/day-streak';

/** Show the membership card on Home only when it needs attention; otherwise it lives on Me. */
const MEMBERSHIP_WARNING_DAYS = 7;

function membershipNeedsAttention(member: GymMember): boolean {
  if (member.status !== MemberStatus.ACTIVE) return true;
  const daysLeft = (new Date(member.expiryDate).getTime() - Date.now()) / 86_400_000;
  return daysLeft <= MEMBERSHIP_WARNING_DAYS;
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
  const streakQ = useMyCheckinStreak();
  const whosHereQ = useActivePublicCheckins();
  const planQ = useCurrentFitnessPlan();
  const dailyQ = useDailyNutrition();
  const profileQ = useMyProfile();

  const isLoading = memberQ.isLoading || checkInsQ.isLoading;
  const refreshing = memberQ.isRefetching || checkInsQ.isRefetching;
  const loadFailed = (memberQ.isError && !memberQ.data) || (checkInsQ.isError && !checkInsQ.data);
  const member = memberQ.data ?? null;
  const checkIns: CheckIn[] = checkInsQ.data ?? [];

  function handleRefresh() {
    memberQ.refetch();
    checkInsQ.refetch();
    streakQ.refetch();
    whosHereQ.refetch();
    planQ.refetch();
    dailyQ.refetch();
  }

  const latest = checkIns[0];
  const activeCheckIn = latest && latest.checkedOutAt === null ? latest : null;
  const streak = streakQ.data?.streak ?? 0;
  const lastCheckInToday = latest !== undefined && isToday(latest.checkedInAt);
  // A restored session's token has no name, so fall back to the member record.
  const firstName = (user?.fullName || member?.user?.fullName || '').split(' ')[0] || 'there';
  const hereCount = whosHereQ.data?.totalCount;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + SPACING.sm }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />}
      showsVerticalScrollIndicator={false}
    >
      <GreetingBanner name={firstName} streak={streak} lastCheckInToday={lastCheckInToday} kcalLeft={dailyQ.data?.remaining?.kcal ?? null} />

      {isLoading ? (
        <View style={styles.stack}>
          <Skeleton height={64} />
          <Skeleton height={168} />
          <Skeleton height={64} />
        </View>
      ) : loadFailed ? (
        <EmptyState
          icon="cloud-offline-outline"
          tone="error"
          title="Couldn't load your home screen"
          message="Check your connection and try again."
          action={{ label: 'Try again', onPress: handleRefresh }}
        />
      ) : (
        <>
          {/* What's happening right now: only shown when something is */}
          {activeSession && (
            <StatusRow
              icon="barbell"
              title="Workout in progress"
              subtitle={`${activeSession.workoutType} · tap to resume`}
              onPress={() => router.push('/(member)/workout')}
            />
          )}
          {activeCheckIn && (
            <StatusRow
              icon="enter"
              title="Checked in"
              subtitleNode={
                <View style={styles.inline}>
                  <Text style={[styles.rowSubInline, { color: C.textSecondary }]}>In the gym · </Text>
                  <ElapsedTime since={activeCheckIn.checkedInAt} style={[styles.rowSubInline, { color: C.textSecondary }]} />
                </View>
              }
              onPress={() => router.push('/(member)/(tabs)/checkin')}
            />
          )}

          {/* Today: set up a plan, or track against it */}
          {planQ.data === null && (
            <SetupPlanCard
              title="Set up your plan"
              subtitle="One minute to get your daily calorie and protein targets."
              onPress={() => router.push('/onboarding')}
            />
          )}
          {dailyQ.data?.targets && (
            <TodayCard
              data={dailyQ.data}
              onPress={() => router.push('/(member)/nutrition')}
              action={
                <Button
                  label="Log a meal"
                  icon="add"
                  variant="secondary"
                  size="compact"
                  onPress={() => router.push({ pathname: '/(member)/nutrition', params: { add: '1' } })}
                />
              }
            />
          )}
          {planQ.data && (
            <WeightCard
              plan={planQ.data}
              imperial={profileQ.data?.unitSystem === UnitSystem.IMPERIAL}
              onGoalReached={() => router.push('/onboarding')}
            />
          )}

          {member && membershipNeedsAttention(member) && <MembershipCard member={member} />}

          <LinkRow
            icon="sparkles"
            title="AI Coach"
            subtitle="Workouts, meal ideas and form tips"
            onPress={() => router.push('/(member)/ai')}
            accent
          />

          {hereCount !== undefined && (
            <LinkRow
              dot
              title={hereCount === 0 ? 'No one is here right now' : `${hereCount} ${hereCount === 1 ? 'member is' : 'members are'} here now`}
              subtitle="See who's in and set your visibility"
              onPress={() => router.push('/(member)/whos-here')}
            />
          )}
        </>
      )}

      <NewBadgeCelebration />
    </ScrollView>
  );
}

/** A live, tappable "this is happening now" row at the top of Home. */
function StatusRow({
  icon,
  title,
  subtitle,
  subtitleNode,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  subtitleNode?: React.ReactNode;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const C = theme.colors;
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      style={[styles.row, { backgroundColor: C.surface, borderColor: C.success + '50' }]}
    >
      <View style={[styles.rowIcon, { backgroundColor: C.successBg }]}>
        <Ionicons name={icon} size={20} color={C.success} />
      </View>
      <View style={styles.flex}>
        <Text style={[styles.rowTitle, { color: C.text }]}>{title}</Text>
        {subtitleNode ?? <Text style={[styles.rowSub, { color: C.textSecondary }]}>{subtitle}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
    </PressableScale>
  );
}

/** A compact link card: AI Coach, Who's here. */
function LinkRow({
  icon,
  dot,
  title,
  subtitle,
  onPress,
  accent,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  dot?: boolean;
  title: string;
  subtitle: string;
  onPress: () => void;
  /** Tints the icon with the gym's colour. */
  accent?: boolean;
}) {
  const { theme } = useTheme();
  const C = theme.colors;
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      style={[styles.row, { backgroundColor: C.surface, borderColor: C.border }]}
    >
      {dot ? (
        <View style={[styles.dot, { backgroundColor: C.success }]} />
      ) : icon ? (
        <View style={[styles.rowIcon, { backgroundColor: accent ? theme.primaryMuted : C.background }]}>
          <Ionicons name={icon} size={20} color={accent ? theme.accentText : C.textSecondary} />
        </View>
      ) : null}
      <View style={styles.flex}>
        <Text style={[styles.rowTitle, { color: C.text }]}>{title}</Text>
        <Text style={[styles.rowSub, { color: C.textSecondary }]}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  stack: { gap: SPACING.md },
  flex: { flex: 1, minWidth: 0 },
  inline: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm + 4,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    marginBottom: SPACING.md,
  },
  rowIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 14, ...FONT.semibold },
  rowSub: { fontSize: 12, marginTop: 2 },
  rowSubInline: { fontSize: 12 },
  dot: { width: 10, height: 10, borderRadius: 5, marginHorizontal: 15 },
});
