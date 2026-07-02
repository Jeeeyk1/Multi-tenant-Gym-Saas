import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useActiveCheckIns, useCheckOut } from '../../hooks/staff';
import { usePendingSubmissions } from '../../hooks/leaderboard';
import { CheckinsTrendChart } from '../../components/CheckinsTrendChart';
import { COLORS, SPACING, RADIUS, FONT, GRADIENTS } from '../../constants/theme';
import type { StaffCheckIn } from '../../types';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatRole(role: string): string {
  return role.charAt(0) + role.slice(1).toLowerCase().replace(/_/g, ' ');
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

function ActiveRow({
  item,
  onCheckOut,
  checkingOut,
}: {
  item: StaffCheckIn;
  onCheckOut: (id: string) => void;
  checkingOut: boolean;
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.activeRow}>
      <View style={styles.activeAvatar}>
        <Text style={[styles.activeAvatarText, { color: theme.primary }]}>
          {getInitials(item.member.user.fullName)}
        </Text>
      </View>
      <View style={styles.activeInfo}>
        <Text style={styles.activeName} numberOfLines={1}>
          {item.member.user.fullName}
        </Text>
        <Text style={styles.activeSince}>Since {formatTime(item.checkedInAt)}</Text>
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
  const { user } = useAuth();
  const { theme } = useTheme();
  const activeCheckInsQ = useActiveCheckIns();
  const checkOutMutation = useCheckOut();
  const pendingSubmissionsQ = usePendingSubmissions();
  const canViewReports = user?.permissions.includes('reports.view') ?? false;

  const activeCheckIns: StaffCheckIn[] = activeCheckInsQ.data ?? [];
  const pendingCount = pendingSubmissionsQ.data?.length ?? 0;
  const isLoading = activeCheckInsQ.isLoading;
  const refreshing = activeCheckInsQ.isRefetching;
  const error =
    (activeCheckInsQ.error as { message?: string } | null)?.message ?? null;
  const checkingOutId = checkOutMutation.isPending
    ? checkOutMutation.variables ?? null
    : null;

  const handleCheckOut = (checkinId: string) => {
    checkOutMutation.mutate(checkinId);
  };

  const firstName = user?.fullName?.split(' ')[0] ?? 'Staff';
  const staffRole = user?.roles.find((r) => r !== 'MEMBER') ?? 'STAFF';
  const previewList = activeCheckIns.slice(0, 5);

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
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => activeCheckInsQ.refetch()} tintColor={theme.primary} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: theme.primary }]}>{getGreeting()}, {firstName}</Text>
          <Text style={styles.pageTitle}>Staff Dashboard</Text>
        </View>
        <View style={styles.rolePill}>
          <Text style={styles.rolePillText}>{formatRole(staffRole)}</Text>
        </View>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Active stat card */}
      <LinearGradient
        colors={GRADIENTS.accentCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.statCard}
      >
        <Text style={styles.statLabel}>ACTIVE RIGHT NOW</Text>
        <Text style={[styles.statCount, { color: theme.primary }]}>{activeCheckIns.length}</Text>
        <Text style={styles.statSub}>
          {activeCheckIns.length === 1 ? 'member in gym' : 'members in gym'}
        </Text>
      </LinearGradient>

      {/* Quick action */}
      <TouchableOpacity
        style={styles.quickAction}
        onPress={() => router.navigate('/(staff)/checkins')}
        activeOpacity={0.75}
      >
        <View style={styles.quickActionLeft}>
          <View style={styles.quickActionIcon}>
            <Ionicons name="person-add-outline" size={20} color={theme.primary} />
          </View>
          <Text style={styles.quickActionText}>Check In a Member</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
      </TouchableOpacity>

      {/* Pending PR reviews */}
      {pendingCount > 0 && (
        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => router.push('/(staff)/leaderboard')}
          activeOpacity={0.75}
        >
          <View style={styles.quickActionLeft}>
            <View style={styles.quickActionIcon}>
              <Ionicons name="trophy-outline" size={20} color={theme.primary} />
            </View>
            <Text style={styles.quickActionText}>
              {pendingCount} PR {pendingCount === 1 ? 'submission' : 'submissions'} pending review
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
      )}

      {/* Check-ins trend */}
      {canViewReports && <CheckinsTrendChart />}

      {/* Active now list (preview) */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>CURRENTLY ACTIVE</Text>
        {activeCheckIns.length > 5 && (
          <TouchableOpacity onPress={() => router.navigate('/(staff)/checkins')}>
            <Text style={[styles.seeAll, { color: theme.primary }]}>See all →</Text>
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
            <View
              key={item.id}
              style={[
                index < previewList.length - 1 && styles.activeRowBorder,
              ]}
            >
              <ActiveRow
                item={item}
                onCheckOut={handleCheckOut}
                checkingOut={checkingOutId === item.id}
              />
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  centered: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 48 : SPACING.lg,
    marginBottom: SPACING.lg,
  },
  greeting: {
    fontSize: 13,
    color: COLORS.primary,
    ...FONT.medium,
    marginBottom: 4,
  },
  pageTitle: { fontSize: 26, color: COLORS.text, ...FONT.bold },
  rolePill: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 6,
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

  // Stat card
  statCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    ...FONT.semibold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  statCount: {
    fontSize: 52,
    color: COLORS.primary,
    ...FONT.bold,
    lineHeight: 56,
  },
  statSub: { fontSize: 14, color: COLORS.textSecondary, ...FONT.regular, marginTop: 4 },

  // Quick action
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  quickActionLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  quickActionIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionText: { fontSize: 15, color: COLORS.text, ...FONT.medium },

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
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  activeRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
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
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    borderRadius: RADIUS.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 48,
    alignItems: 'center',
  },
  checkOutBtnText: { fontSize: 12, color: COLORS.textSecondary, ...FONT.medium },

  // Empty state
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, ...FONT.regular },
});
