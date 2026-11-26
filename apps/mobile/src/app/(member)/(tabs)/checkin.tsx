import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { Text } from '../../../components/Text';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import {
  useActivePublicCheckins,
  useMyCheckIns,
  useMyCheckinStreak,
  useMyMember,
  useSelfCheckIn,
  useSelfCheckOut,
} from '../../../hooks/members';
import { Button, EmptyState, HoldButton, ScreenHeader, Skeleton, SlideToConfirm, useToast } from '../../../components/ui';
import { CheckinQrSheet } from '../../../components/checkin/CheckinQrSheet';
import { ElapsedTime } from '../../../components/checkin/ElapsedTime';
import { formatApiError } from '../../../lib/format-error';
import { haptic } from '../../../lib/haptics';
import { CheckInErrorCode, MemberStatus } from '../../../constants/enums';
import { FONT, RADIUS, SPACING } from '../../../constants/theme';
import { fonts } from '../../../theme/typography';
import type { CheckIn } from '../../../types';

// Same limit as Home so both screens share one cached query.
const RECENT_CHECKINS = 7;

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function minutesSince(iso: string) {
  return Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
}

export default function CheckInScreen() {
  const router = useRouter();
  const { gymInfo } = useAuth();
  const { theme } = useTheme();
  const C = theme.colors;
  const toast = useToast();

  const checkInsQ = useMyCheckIns(RECENT_CHECKINS);
  const memberQ = useMyMember();
  const hereQ = useActivePublicCheckins();
  const streakQ = useMyCheckinStreak();
  const selfCheckIn = useSelfCheckIn();
  const selfCheckOut = useSelfCheckOut();
  const [qrOpen, setQrOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // Set when the API refuses a check-in for the membership, before the member record refetches.
  const [blockedBy, setBlockedBy] = useState<CheckInErrorCode | null>(null);

  const { refetch: refetchCheckIns } = checkInsQ;
  // Staff check-outs and auto check-out happen elsewhere; refresh whenever the tab is shown.
  useFocusEffect(
    useCallback(() => {
      refetchCheckIns();
    }, [refetchCheckIns]),
  );

  const checkIns = checkInsQ.data ?? [];
  const latest = checkIns[0];
  const active = latest && latest.checkedOutAt === null ? latest : null;
  const streak = streakQ.data?.streak ?? 0;
  const member = memberQ.data;
  const membershipBlocked = blockedBy !== null || (member !== undefined && member.status !== MemberStatus.ACTIVE);
  const hereCount = hereQ.data?.totalCount;

  const onRefresh = async () => {
    setRefreshing(true);
    setBlockedBy(null);
    await Promise.all([checkInsQ.refetch(), memberQ.refetch(), hereQ.refetch(), streakQ.refetch()]);
    setRefreshing(false);
  };

  const handleCheckIn = () => {
    selfCheckIn.mutate(undefined, {
      onSuccess: (res) => {
        haptic.success();
        toast.show(`Checked in at ${formatTime(res.checkedInAt)}`);
      },
      onError: (err) => {
        const code = (err as { code?: string }).code;
        if (code === CheckInErrorCode.ALREADY_CHECKED_IN) {
          toast.show("You're already checked in.", { tone: 'info' });
          checkInsQ.refetch();
        } else if (code === CheckInErrorCode.MEMBERSHIP_EXPIRED || code === CheckInErrorCode.MEMBER_NOT_ACTIVE) {
          setBlockedBy(code);
          memberQ.refetch();
          haptic.error();
        } else {
          toast.show(formatApiError(err, "Couldn't check you in. Try again."), { tone: 'error' });
        }
      },
    });
  };

  const handleCheckOut = () => {
    if (!active) return;
    const minutes = minutesSince(active.checkedInAt);
    selfCheckOut.mutate(active.id, {
      onSuccess: () => toast.show(`Checked out · ${minutes} min in the gym`),
      onError: (err) => toast.show(formatApiError(err, "Couldn't check you out. Try again."), { tone: 'error' }),
    });
  };

  const loading = (checkInsQ.isLoading || memberQ.isLoading) && !checkInsQ.data;

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <ScreenHeader title="Check in" subtitle={gymInfo?.gymName || undefined} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
      >
        {loading ? (
          <View style={styles.stack}>
            <Skeleton height={96} />
            <Skeleton height={60} radius={18} />
            <Skeleton height={52} radius={RADIUS.button} />
          </View>
        ) : checkInsQ.isError && !checkInsQ.data ? (
          <EmptyState
            icon="cloud-offline-outline"
            tone="error"
            title="Couldn't load your check-ins"
            message="Check your connection and try again."
            action={{ label: 'Try again', onPress: onRefresh }}
          />
        ) : active ? (
          <Animated.View entering={FadeInDown.springify().damping(18)} style={styles.stack}>
            <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={styles.row}>
                <Animated.View entering={ZoomIn.springify().damping(12)} style={[styles.tick, { backgroundColor: theme.primary }]}>
                  <Ionicons name="checkmark" size={28} color={theme.onPrimary} />
                </Animated.View>
                <View style={styles.flex}>
                  <Text variant="h3" style={{ color: C.text }}>
                    Checked in at {formatTime(active.checkedInAt)}
                  </Text>
                  <View style={styles.row}>
                    <Text variant="label" style={{ color: C.textMuted }}>
                      In the gym ·{' '}
                    </Text>
                    <ElapsedTime since={active.checkedInAt} style={[styles.mono, { color: C.textSecondary }]} />
                  </View>
                </View>
              </View>
              <View style={[styles.stats, { borderTopColor: C.border }]}>
                <Stat label="Streak" value={streak} unit={streak === 1 ? 'day' : 'days'} />
                <Stat label="Here now" value={hereCount} />
              </View>
            </View>
            <HoldButton label="Hold to check out" onConfirm={handleCheckOut} loading={selfCheckOut.isPending} />
            <Button label="Show my QR" icon="qr-code-outline" variant="secondary" onPress={() => setQrOpen(true)} />
          </Animated.View>
        ) : membershipBlocked ? (
          <Animated.View entering={FadeIn} style={styles.stack}>
            <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.warning }]} accessibilityRole="alert">
              <Text style={[styles.eyebrow, { color: C.warning }]}>Can&apos;t check in</Text>
              <Text variant="h3" style={{ color: C.text }}>
                {blockedBy === CheckInErrorCode.MEMBERSHIP_EXPIRED || member?.status === MemberStatus.EXPIRED
                  ? 'Your membership has ended'
                  : "Your membership isn't active"}
              </Text>
              <Text variant="label" style={{ color: C.textSecondary }}>
                Renew or ask about your membership at the front desk, then check in again.
              </Text>
            </View>
            <Button label="View membership" onPress={() => router.push('/(member)/membership')} />
          </Animated.View>
        ) : (
          <Animated.View entering={FadeIn} style={styles.stack}>
            <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={[styles.row, styles.between]}>
                <Text style={[styles.eyebrow, { color: C.textMuted }]}>Not checked in</Text>
                {hereCount !== undefined ? (
                  <View style={styles.row}>
                    <View style={[styles.dot, { backgroundColor: C.success }]} />
                    <Text variant="caption" style={{ color: C.textSecondary }}>
                      {hereCount} here now
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text variant="label" style={{ color: C.textSecondary }}>
                {streak > 0
                  ? `You're on a ${streak}-day streak. Check in to keep it going.`
                  : 'Check in when you arrive to start a streak.'}
              </Text>
            </View>
            <SlideToConfirm label="Slide to check in" onConfirm={handleCheckIn} loading={selfCheckIn.isPending} />
            <Button label="Show my QR instead" icon="qr-code-outline" variant="secondary" onPress={() => setQrOpen(true)} />
            <Text variant="caption" style={[styles.hint, { color: C.textMuted }]}>
              Staff can also scan your QR at the desk.
            </Text>
          </Animated.View>
        )}

        {!loading && checkIns.some((c) => c.checkedOutAt !== null) ? <RecentVisits checkIns={checkIns} /> : null}
      </ScrollView>

      <CheckinQrSheet
        visible={qrOpen}
        onClose={() => setQrOpen(false)}
        qrCodeToken={member?.qrCodeToken}
        membershipNumber={member?.membershipNumber}
      />
    </View>
  );
}

/** The last few finished visits (moved here from Home). */
function RecentVisits({ checkIns }: { checkIns: CheckIn[] }) {
  const { theme } = useTheme();
  const C = theme.colors;
  const visits = checkIns.filter((c) => c.checkedOutAt !== null).slice(0, 5);
  return (
    <View style={styles.recent}>
      <Text style={[styles.eyebrow, { color: C.textMuted }]}>Recent visits</Text>
      <View style={[styles.list, { backgroundColor: C.surface, borderColor: C.border }]}>
        {visits.map((v, i) => {
          const start = new Date(v.checkedInAt);
          const minutes = Math.round((new Date(v.checkedOutAt!).getTime() - start.getTime()) / 60000);
          return (
            <View key={v.id} style={[styles.visit, i > 0 && { borderTopWidth: 1, borderTopColor: C.border }]}>
              <View>
                <Text variant="label" style={{ color: C.text }}>
                  {start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </Text>
                <Text variant="caption" style={{ color: C.textMuted }}>
                  {formatTime(v.checkedInAt)}
                </Text>
              </View>
              <Text variant="caption" style={{ color: C.textSecondary }}>
                {minutes} min
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function Stat({ label, value, unit }: { label: string; value: number | undefined; unit?: string }) {
  const { theme } = useTheme();
  const C = theme.colors;
  return (
    <View style={styles.flex}>
      <Text style={[styles.eyebrow, { color: C.textMuted }]}>{label}</Text>
      <Text variant="metric" style={{ color: C.text }}>
        {value ?? '–'}
        {unit && value !== undefined ? <Text variant="label" style={{ color: C.textMuted }}>{` ${unit}`}</Text> : null}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.xl },
  stack: { gap: SPACING.md - 4 },
  card: { borderWidth: 1, borderRadius: RADIUS.xl, padding: SPACING.md, gap: SPACING.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  between: { justifyContent: 'space-between' },
  flex: { flex: 1, minWidth: 0 },
  tick: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  stats: { flexDirection: 'row', borderTopWidth: 1, paddingTop: SPACING.sm + 4, marginTop: SPACING.xs },
  eyebrow: { fontFamily: fonts.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  mono: { ...FONT.mono, fontSize: 13 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  hint: { textAlign: 'center' },
  recent: { marginTop: SPACING.xl, gap: SPACING.sm },
  list: { borderWidth: 1, borderRadius: RADIUS.xl, overflow: 'hidden' },
  visit: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: 12 },
});
