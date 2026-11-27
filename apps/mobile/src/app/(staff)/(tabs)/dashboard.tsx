import React from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Text } from '../../../components/Text';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';
import { AppLoader } from '../../../components/AppLoader';
import { StaffHeader } from '../../../components/StaffHeader';
import { useActiveCheckIns, useCheckOut, useStaffMembers } from '../../../hooks/staff';
import { usePendingSubmissions } from '../../../hooks/leaderboard';
import { CheckinsTrendChart } from '../../../components/CheckinsTrendChart';
import { STAFF_COLORS as COLORS, SPACING, RADIUS, FONT, STAFF_SURFACE_RAISED } from '../../../constants/theme';
import type { StaffCheckIn, MemberListItem } from '../../../types';
import { MEMBER_ROLE, Permission } from '../../../constants/enums';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatRole(role: string): string {
  return role.charAt(0) + role.slice(1).toLowerCase().replace(/_/g, ' ');
}

function formatElapsed(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

// ─── Pulse-grid metric tile ──────────────────────────────────────────────────

function MetricTile({
  icon,
  value,
  label,
  accent,
  primary,
  badge,
  onPress,
}: {
  icon: IoniconsName;
  value: number;
  label: string;
  /** Color for the value + icon chip. Falls back to neutral text when omitted. */
  accent?: string;
  /** Themed highlight tile (the live metric). */
  primary?: boolean;
  badge?: string;
  onPress?: () => void;
}) {
  const chipColor = accent ?? COLORS.textSecondary;
  return (
    <TouchableOpacity
      style={[
        styles.metric,
        primary && accent ? { backgroundColor: accent + '14', borderColor: accent + '40' } : null,
      ]}
      activeOpacity={onPress ? 0.75 : 1}
      onPress={onPress}
      disabled={!onPress}
    >
      {badge ? (
        <View style={[styles.metricBadge, { backgroundColor: chipColor + '22' }]}>
          <Text style={[styles.metricBadgeText, { color: chipColor }]}>{badge}</Text>
        </View>
      ) : null}
      <View style={[styles.metricChip, { backgroundColor: chipColor + '1F' }]}>
        <Ionicons name={icon} size={16} color={chipColor} />
      </View>
      <Text style={[styles.metricValue, accent ? { color: accent } : null]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Currently-active row ─────────────────────────────────────────────────────

function ActiveRow({
  item,
  onCheckOut,
  checkingOut,
}: {
  item: StaffCheckIn;
  onCheckOut: (id: string) => void;
  checkingOut: boolean;
}) {
  return (
    <View style={styles.activeRow}>
      <View style={[styles.activeAvatar, { backgroundColor: COLORS.primary + '18' }]}>
        <Text style={[styles.activeAvatarText, { color: COLORS.primary }]}>
          {getInitials(item.member.user.fullName)}
        </Text>
      </View>
      <View style={styles.activeInfo}>
        <Text style={styles.activeName} numberOfLines={1}>
          {item.member.user.fullName}
        </Text>
        <Text style={styles.activeSince}>
          {[item.member.membershipNumber, formatElapsed(item.checkedInAt)].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.checkOutBtn}
        onPress={() => onCheckOut(item.id)}
        disabled={checkingOut}
        activeOpacity={0.7}
      >
        {checkingOut ? (
          <ActivityIndicator size="small" color={COLORS.textMuted} />
        ) : (
          <Text style={styles.checkOutBtnText}>Out</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

export default function StaffDashboardScreen() {
  const router = useRouter();
  const { user, can } = useAuth();
  const activeCheckInsQ = useActiveCheckIns();
  const membersQ = useStaffMembers();
  const checkOutMutation = useCheckOut();
  const pendingSubmissionsQ = usePendingSubmissions();
  const canViewReports = can(Permission.REPORTS_VIEW);
  // Trainers don't receive expiry dates; they get their review queue instead.
  const seesMemberDetails = can(Permission.MEMBERS_DETAILS);

  const activeCheckIns: StaffCheckIn[] = activeCheckInsQ.data ?? [];
  const members: MemberListItem[] = membersQ.data?.data ?? [];
  const totalMembers = membersQ.data?.meta.total ?? members.length;
  // Roster is capped at 150 on the Standard plan, well under the 200-member fetch
  // limit, so deriving these counts client-side covers the whole gym.
  const expiringSoon = members.filter(
    (m) => m.status === 'ACTIVE' && daysUntil(m.expiryDate) >= 0 && daysUntil(m.expiryDate) <= 7,
  ).length;
  const expiredCount = members.filter((m) => m.status === 'EXPIRED').length;
  const pendingCount = pendingSubmissionsQ.data?.length ?? 0;

  const isLoading = activeCheckInsQ.isLoading;
  const refreshing = activeCheckInsQ.isRefetching || membersQ.isRefetching;
  const error = (activeCheckInsQ.error as { message?: string } | null)?.message ?? null;
  const checkingOutId = checkOutMutation.isPending ? checkOutMutation.variables ?? null : null;

  const handleCheckOut = (checkinId: string) => {
    checkOutMutation.mutate(checkinId);
  };

  const firstName = user?.fullName?.split(' ')[0] ?? 'Staff';
  const staffRole = user?.roles.find((r) => r !== MEMBER_ROLE) ?? 'STAFF';
  const previewList = activeCheckIns.slice(0, 5);

  const goToMembers = (filter?: 'active' | 'expiring' | 'expired') =>
    router.navigate({ pathname: '/(staff)/(tabs)/members', params: filter ? { filter } : {} });

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <AppLoader />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StaffHeader
        greeting={`${getGreeting()}, ${firstName}`}
        title="Dashboard"
        right={
          <View style={styles.rolePill}>
            <Text style={styles.rolePillText}>{formatRole(staffRole)}</Text>
          </View>
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              activeCheckInsQ.refetch();
              membersQ.refetch();
            }}
            tintColor={COLORS.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Pulse grid */}
        <View style={styles.grid}>
          <MetricTile
            icon="pulse-outline"
            value={activeCheckIns.length}
            label="Active right now"
            accent={COLORS.primary}
            primary
            onPress={() => router.navigate('/(staff)/(tabs)/checkins')}
          />
          <MetricTile
            icon="people-outline"
            value={totalMembers}
            label="Total members"
            onPress={() => goToMembers()}
          />
          {seesMemberDetails ? (
            <MetricTile
              icon="time-outline"
              value={expiringSoon}
              label="Expiring soon"
              accent={COLORS.warning}
              badge="7 days"
              onPress={() => goToMembers('expiring')}
            />
          ) : (
            <MetricTile
              icon="trophy-outline"
              value={pendingCount}
              label="PRs to review"
              accent={COLORS.warning}
              onPress={() => router.navigate('/(staff)/leaderboard')}
            />
          )}
          <MetricTile
            icon="alert-circle-outline"
            value={expiredCount}
            label="Expired"
            accent={COLORS.expired}
            onPress={() => goToMembers('expired')}
          />
        </View>

        {/* Primary action */}
        <TouchableOpacity
          style={[styles.cta, { backgroundColor: COLORS.primary }]}
          onPress={() => router.navigate('/(staff)/(tabs)/checkins')}
          activeOpacity={0.85}
        >
          <View style={styles.ctaIcon}>
            <Ionicons name="person-add-outline" size={20} color={COLORS.onPrimary} />
          </View>
          <View style={styles.ctaText}>
            <Text style={styles.ctaTitle}>Check in a member</Text>
            <Text style={styles.ctaSub}>Scan QR or search by name</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.onPrimary} />
        </TouchableOpacity>

        {/* Pending reviews — status-colored alert, not another gray row */}
        {/* Trainers already have a "PRs to review" tile above. */}
        {seesMemberDetails && pendingCount > 0 && (
          <TouchableOpacity
            style={styles.alert}
            onPress={() => router.push('/(staff)/leaderboard')}
            activeOpacity={0.8}
          >
            <Ionicons name="trophy-outline" size={18} color={COLORS.warning} />
            <Text style={styles.alertText}>
              {pendingCount} PR {pendingCount === 1 ? 'submission' : 'submissions'} pending review
            </Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.warning} />
          </TouchableOpacity>
        )}

        {/* Check-ins trend */}
        {canViewReports && (
          <View style={styles.chartWrap}>
            <CheckinsTrendChart />
          </View>
        )}

        {/* Active now list (preview) */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>CURRENTLY ACTIVE</Text>
          {activeCheckIns.length > 5 && (
            <TouchableOpacity onPress={() => router.navigate('/(staff)/(tabs)/checkins')}>
              <Text style={[styles.seeAll, { color: COLORS.primary }]}>See all →</Text>
            </TouchableOpacity>
          )}
        </View>

        {previewList.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="fitness-outline" size={32} color={COLORS.border} />
            <Text style={styles.emptyText}>No one is checked in yet</Text>
          </View>
        ) : (
          <View style={styles.activeList}>
            {previewList.map((item, index) => (
              <View key={item.id} style={index < previewList.length - 1 ? styles.activeRowBorder : undefined}>
                <ActiveRow item={item} onCheckOut={handleCheckOut} checkingOut={checkingOutId === item.id} />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxl },
  centered: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  rolePill: {
    backgroundColor: STAFF_SURFACE_RAISED,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  rolePillText: { fontSize: 12, color: COLORS.textMuted, ...FONT.medium },

  errorBox: {
    backgroundColor: COLORS.errorBg,
    borderWidth: 1,
    borderColor: COLORS.error,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  errorText: { color: COLORS.error, fontSize: 13 },

  // Pulse grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  metric: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    position: 'relative',
    overflow: 'hidden',
  },
  metricChip: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  metricValue: { fontSize: 28, color: COLORS.text, ...FONT.bold, lineHeight: 30 },
  metricLabel: { fontSize: 12, color: COLORS.textSecondary, ...FONT.medium, marginTop: 4 },
  metricBadge: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  metricBadgeText: { fontSize: 10, ...FONT.semibold },

  // Primary action
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  ctaIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.onPrimary + '26',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { flex: 1 },
  ctaTitle: { fontSize: 15, color: COLORS.onPrimary, ...FONT.semibold },
  ctaSub: { fontSize: 12, color: COLORS.onPrimary + 'A6', ...FONT.regular, marginTop: 1 },

  // Alert
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.warningBg,
    borderWidth: 1,
    borderColor: COLORS.warning,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    marginBottom: SPACING.lg,
  },
  alertText: { flex: 1, fontSize: 13, color: COLORS.warning, ...FONT.medium },

  chartWrap: { marginBottom: SPACING.lg },

  // Section header
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    ...FONT.semibold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  seeAll: { fontSize: 13, color: COLORS.primary, ...FONT.medium },

  // Active list
  activeList: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  activeRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    gap: SPACING.sm,
  },
  activeAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeAvatarText: { fontSize: 13, color: COLORS.primary, ...FONT.semibold },
  activeInfo: { flex: 1 },
  activeName: { fontSize: 14, color: COLORS.text, ...FONT.medium },
  activeSince: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  checkOutBtn: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.control,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 48,
    alignItems: 'center',
  },
  checkOutBtnText: { fontSize: 12, color: COLORS.textSecondary, ...FONT.medium },

  // Empty state
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, ...FONT.regular },
});
