import React from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Text } from '../../components/Text';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { StaffHeader } from '../../components/StaffHeader';
import { COLORS, SPACING, RADIUS, FONT } from '../../constants/theme';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function formatRole(role: string): string {
  return role.charAt(0) + role.slice(1).toLowerCase().replace(/_/g, ' ');
}

function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
}

export default function MoreScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { theme } = useTheme();

  const staffRoles = user?.roles.filter((r) => r !== 'MEMBER') ?? [];
  const firstName = user?.fullName?.split(' ')[0] ?? 'Staff';
  const initials = user?.fullName ? getInitials(user.fullName) : '??';

  const allTools: { label: string; icon: IoniconsName; route: string; permission?: string }[] = [
    { label: 'Renewals', icon: 'refresh-outline', route: '/(staff)/renewals', permission: 'members.renew' },
    { label: 'Chat', icon: 'chatbubbles-outline', route: '/(staff)/chat', permission: 'chat.manage' },
    { label: 'Badges', icon: 'ribbon-outline', route: '/(staff)/badges', permission: 'badges.award' },
    { label: 'Plans', icon: 'pricetags-outline', route: '/(staff)/plans', permission: 'plans.view' },
    { label: 'Leaderboard', icon: 'trophy-outline', route: '/(staff)/leaderboard' },
    { label: 'AI Assistant', icon: 'sparkles-outline', route: '/(staff)/insights', permission: 'insights.query' },
  ];
  const tools = allTools.filter((t) => !t.permission || (user?.permissions.includes(t.permission) ?? false));

  return (
    <View style={styles.container}>
      <StaffHeader title="More" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Profile card */}
      <View style={styles.profileCard}>
        <View style={[styles.avatar, { borderColor: theme.primary }]}>
          <Text style={[styles.avatarText, { color: theme.primary }]}>{initials}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{user?.fullName ?? firstName}</Text>
          <Text style={styles.profileEmail}>{user?.email ?? ''}</Text>
          <View style={styles.rolesRow}>
            {staffRoles.map((role) => (
              <View key={role} style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>{formatRole(role)}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Tools */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>TOOLS</Text>
        {tools.map((tool, index) => (
          <TouchableOpacity
            key={tool.route}
            style={[styles.navRow, index < tools.length - 1 && styles.navRowBorder]}
            onPress={() => router.push(tool.route as never)}
            activeOpacity={0.7}
          >
            <Ionicons name={tool.icon} size={18} color={COLORS.textMuted} />
            <Text style={styles.navLabel}>{tool.label}</Text>
            <Ionicons name="chevron-forward" size={15} color={COLORS.border} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Info row */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>SESSION</Text>
        <View style={styles.infoRow}>
          <Ionicons name="fitness-outline" size={18} color={COLORS.textMuted} />
          <Text style={styles.infoLabel}>Gym ID</Text>
          <Text style={styles.infoValue} numberOfLines={1}>{user?.gymId ?? '—'}</Text>
        </View>
        <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
          <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.textMuted} />
          <Text style={styles.infoLabel}>Permissions</Text>
          <Text style={styles.infoValue}>{user?.permissions.length ?? 0} granted</Text>
        </View>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={signOut} activeOpacity={0.75}>
        <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxl },

  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    color: COLORS.primary,
    ...FONT.bold,
  },
  profileInfo: { flex: 1, gap: 3 },
  profileName: { fontSize: 16, color: COLORS.text, ...FONT.semibold },
  profileEmail: { fontSize: 13, color: COLORS.textMuted, ...FONT.regular },
  rolesRow: { flexDirection: 'row', gap: SPACING.xs, marginTop: 4, flexWrap: 'wrap' },
  roleBadge: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  roleBadgeText: { fontSize: 11, color: COLORS.textMuted, ...FONT.medium },

  section: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
  },
  sectionLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    ...FONT.semibold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
  },
  navRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  navLabel: { flex: 1, fontSize: 14, color: COLORS.text, ...FONT.medium },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoLabel: { flex: 1, fontSize: 14, color: COLORS.textSecondary, ...FONT.regular },
  infoValue: { fontSize: 13, color: COLORS.textMuted, ...FONT.regular, maxWidth: 180 },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.errorBg,
    borderWidth: 1,
    borderColor: COLORS.error,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
  },
  logoutText: { fontSize: 15, color: COLORS.error, ...FONT.semibold },
});
