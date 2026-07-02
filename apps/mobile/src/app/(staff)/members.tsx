import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useStaffMembers } from '../../hooks/staff';
import { COLORS, SPACING, RADIUS, FONT } from '../../constants/theme';
import type { MemberListItem } from '../../types';

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: COLORS.active,
  EXPIRED: COLORS.expired,
  SUSPENDED: COLORS.suspended,
};

function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

function formatExpiry(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function MemberRow({ item, onPress }: { item: MemberListItem; onPress: () => void }) {
  const statusColor = STATUS_COLOR[item.status] ?? COLORS.textMuted;
  const { theme } = useTheme();
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.avatar}>
        <Text style={[styles.avatarText, { color: theme.primary }]}>{getInitials(item.user.fullName)}</Text>
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.memberName} numberOfLines={1}>
          {item.user.fullName}
        </Text>
        <Text style={styles.memberSub} numberOfLines={1}>
          {item.membershipNumber}
          {item.membershipPlan ? ` · ${item.membershipPlan.name}` : ''}
        </Text>
      </View>
      <View style={styles.rowRight}>
        <View style={[styles.statusBadge, { borderColor: statusColor }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
        </View>
        <Text style={styles.expiryText}>Exp {formatExpiry(item.expiryDate)}</Text>
      </View>
      <Ionicons name="chevron-forward" size={15} color={COLORS.border} />
    </TouchableOpacity>
  );
}

export default function MembersScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const membersQ = useStaffMembers();
  const [search, setSearch] = useState('');

  const members: MemberListItem[] = membersQ.data?.data ?? [];
  const isLoading = membersQ.isLoading;
  const refreshing = membersQ.isRefetching;
  const error = (membersQ.error as { message?: string } | null)?.message ?? null;

  const filtered = useMemo(() => {
    if (!search.trim()) return members;
    const q = search.toLowerCase();
    return members.filter(
      (m) =>
        m.user.fullName.toLowerCase().includes(q) ||
        m.membershipNumber.toLowerCase().includes(q) ||
        m.user.email.toLowerCase().includes(q),
    );
  }, [members, search]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.screenTitle}>Members</Text>
          <Text style={styles.memberCount}>{members.length} total</Text>
        </View>
      </View>

      {/* Search bar */}
      <View style={styles.searchWrapper}>
        <Ionicons name="search-outline" size={15} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search name, membership # or email"
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Member list */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <View style={index < filtered.length - 1 ? styles.rowBorder : undefined}>
            <MemberRow
              item={item}
              onPress={() =>
                router.push({ pathname: '/(staff)/member/[id]', params: { id: item.id } })
              }
            />
          </View>
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => membersQ.refetch()}
            tintColor={theme.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={36} color={COLORS.border} />
            <Text style={styles.emptyText}>
              {search.trim() ? 'No members match your search' : 'No members yet'}
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  header: {
    paddingTop: Platform.OS === 'ios' ? 48 : SPACING.lg,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  screenTitle: { fontSize: 28, color: COLORS.text, ...FONT.bold },
  memberCount: { fontSize: 13, color: COLORS.textMuted, ...FONT.regular, marginTop: 2 },

  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    ...FONT.regular,
  },

  errorBox: {
    backgroundColor: COLORS.errorBg,
    borderWidth: 1,
    borderColor: COLORS.error,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  errorText: { color: COLORS.error, fontSize: 13 },

  list: { flex: 1 },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: SPACING.sm,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: { fontSize: 13, color: COLORS.primary, ...FONT.semibold },
  rowInfo: { flex: 1, minWidth: 0 },
  memberName: { fontSize: 14, color: COLORS.text, ...FONT.medium },
  memberSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  rowRight: { alignItems: 'flex-end', gap: 4 },
  statusBadge: {
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusText: { fontSize: 10, ...FONT.semibold, textTransform: 'uppercase', letterSpacing: 0.4 },
  expiryText: { fontSize: 11, color: COLORS.textMuted, ...FONT.regular },

  // Empty
  empty: {
    alignItems: 'center',
    paddingTop: SPACING.xxl,
    gap: SPACING.sm,
  },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, ...FONT.regular, marginTop: 4 },
});
