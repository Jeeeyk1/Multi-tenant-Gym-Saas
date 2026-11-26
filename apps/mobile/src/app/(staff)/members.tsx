import React, { useEffect, useMemo, useState } from 'react';
import { View, FlatList, TextInput, StyleSheet, RefreshControl, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from '../../components/Text';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppLoader } from '../../components/AppLoader';
import { StaffHeader } from '../../components/StaffHeader';
import { useStaffMembers } from '../../hooks/staff';
import { STAFF_COLORS as COLORS, SPACING, RADIUS, FONT } from '../../constants/theme';
import type { MemberListItem } from '../../types';

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: COLORS.active,
  EXPIRED: COLORS.expired,
  SUSPENDED: COLORS.suspended,
};

type MemberFilter = 'all' | 'active' | 'expiring' | 'expired';

const FILTERS: { key: MemberFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'expiring', label: 'Expiring' },
  { key: 'expired', label: 'Expired' },
];

function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

function formatExpiry(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

function isExpiring(m: MemberListItem): boolean {
  return m.status === 'ACTIVE' && daysUntil(m.expiryDate) >= 0 && daysUntil(m.expiryDate) <= 7;
}

function MemberRow({ item, onPress }: { item: MemberListItem; onPress: () => void }) {
  const statusColor = STATUS_COLOR[item.status] ?? COLORS.textMuted;
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.avatar, { backgroundColor: COLORS.primary + '18' }]}>
        <Text style={[styles.avatarText, { color: COLORS.primary }]}>{getInitials(item.user.fullName)}</Text>
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
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '1F' }]}>
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
  const params = useLocalSearchParams<{ filter?: string }>();
  const membersQ = useStaffMembers();
  const [search, setSearch] = useState('');
  const initialFilter = (FILTERS.some((f) => f.key === params.filter) ? params.filter : 'all') as MemberFilter;
  const [filter, setFilter] = useState<MemberFilter>(initialFilter);

  // Tabs stay mounted, so a fresh `filter` param from the dashboard tiles must be
  // applied on navigation — not only on first mount.
  useEffect(() => {
    if (FILTERS.some((f) => f.key === params.filter)) {
      setFilter(params.filter as MemberFilter);
    }
  }, [params.filter]);

  const members: MemberListItem[] = membersQ.data?.data ?? [];
  const total = membersQ.data?.meta.total ?? members.length;
  const isLoading = membersQ.isLoading;
  const refreshing = membersQ.isRefetching;
  const error = (membersQ.error as { message?: string } | null)?.message ?? null;

  const counts = useMemo(
    () => ({
      all: total,
      active: members.filter((m) => m.status === 'ACTIVE').length,
      expiring: members.filter(isExpiring).length,
      expired: members.filter((m) => m.status === 'EXPIRED').length,
    }),
    [members, total],
  );

  const filtered = useMemo(() => {
    let list = members;
    if (filter === 'active') list = list.filter((m) => m.status === 'ACTIVE');
    else if (filter === 'expiring') list = list.filter(isExpiring);
    else if (filter === 'expired') list = list.filter((m) => m.status === 'EXPIRED');

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (m) =>
          m.user.fullName.toLowerCase().includes(q) ||
          // Trainers only receive name and status.
          Boolean(m.membershipNumber?.toLowerCase().includes(q)) ||
          Boolean(m.user.email?.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [members, filter, search]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <AppLoader />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StaffHeader title="Members" subtitle={`${total} total`} />

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

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
        style={styles.chipsScroll}
      >
        {FILTERS.map((f) => {
          const active = filter === f.key;
          const statusTint =
            f.key === 'expiring' ? COLORS.suspended : f.key === 'expired' ? COLORS.expired : undefined;
          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.8}
              style={[
                styles.chip,
                active
                  ? { backgroundColor: COLORS.primary, borderColor: COLORS.primary }
                  : null,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  active ? styles.chipTextActive : statusTint ? { color: statusTint } : null,
                ]}
              >
                {f.label}
                <Text style={active ? styles.chipCountActive : styles.chipCount}> {counts[f.key]}</Text>
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

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
              onPress={() => router.push({ pathname: '/(staff)/member/[id]', params: { id: item.id } })}
            />
          </View>
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => membersQ.refetch()} tintColor={COLORS.primary} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={36} color={COLORS.border} />
            <Text style={styles.emptyText}>
              {search.trim() || filter !== 'all' ? 'No members match this view' : 'No members yet'}
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

  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.control,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
    height: 44,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text, ...FONT.regular },

  // Filter chips
  chipsScroll: { flexGrow: 0, marginBottom: SPACING.md },
  chipsRow: { paddingHorizontal: SPACING.lg, gap: SPACING.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipText: { fontSize: 13, color: COLORS.textSecondary, ...FONT.semibold },
  chipTextActive: { color: COLORS.onPrimary },
  chipCount: { color: COLORS.textMuted, ...FONT.medium },
  chipCountActive: { color: COLORS.onPrimary + 'B3', ...FONT.medium },

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
  listContent: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxl },

  // Row
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: SPACING.sm },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: { fontSize: 13, color: COLORS.primary, ...FONT.semibold },
  rowInfo: { flex: 1, minWidth: 0 },
  memberName: { fontSize: 14, color: COLORS.text, ...FONT.medium },
  memberSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  rowRight: { alignItems: 'flex-end', gap: 4 },
  statusBadge: { borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 10, ...FONT.semibold, textTransform: 'uppercase', letterSpacing: 0.4 },
  expiryText: { fontSize: 11, color: COLORS.textMuted, ...FONT.regular },

  // Empty
  empty: { alignItems: 'center', paddingTop: SPACING.xxl, gap: SPACING.sm },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, ...FONT.regular, marginTop: 4 },
});
