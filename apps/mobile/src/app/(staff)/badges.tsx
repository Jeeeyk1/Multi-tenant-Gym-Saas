import React, { useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, ActivityIndicator, TouchableOpacity, TextInput, Modal, Platform } from 'react-native';
import { Text } from '../../components/Text';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { AppLoader } from '../../components/AppLoader';
import { useCustomBadges, useAwardBadge } from '../../hooks/badges';
import { useStaffMembers } from '../../hooks/staff';
import { COLORS, SPACING, RADIUS, FONT } from '../../constants/theme';
import type { CustomBadge, MemberListItem } from '../../types';

function AwardModal({
  badge,
  onClose,
}: {
  badge: CustomBadge | null;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const membersQ = useStaffMembers();
  const awardMutation = useAwardBadge();

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<MemberListItem | null>(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const members = membersQ.data?.data;
  const filtered = useMemo(() => {
    const list = members ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list.slice(0, 8);
    return list.filter((m) => m.user.fullName.toLowerCase().includes(q)).slice(0, 8);
  }, [members, search]);

  const reset = () => {
    setSearch('');
    setSelected(null);
    setNotes('');
    setError(null);
    setDone(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleAward = () => {
    if (!badge || !selected) return;
    setError(null);
    awardMutation.mutate(
      { memberId: selected.id, customBadgeId: badge.id, proofNotes: notes.trim() || undefined },
      {
        onSuccess: () => setDone(true),
        onError: (err) => setError((err as { message?: string })?.message ?? 'Failed to award badge'),
      },
    );
  };

  return (
    <Modal visible={badge !== null} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.modalWrap}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={handleClose} />
        <View style={styles.modalSheet}>
          <View style={styles.handle} />
          {done ? (
            <View style={styles.doneWrap}>
              <Ionicons name="checkmark-circle" size={48} color={theme.primary} />
              <Text style={styles.doneText}>
                Awarded {badge?.name} to {selected?.user.fullName}
              </Text>
              <TouchableOpacity style={[styles.awardBtn, { backgroundColor: theme.primary }]} onPress={handleClose}>
                <Text style={styles.awardBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.modalTitle}>Award “{badge?.name}”</Text>
              <Text style={styles.modalLabel}>Member</Text>
              {selected ? (
                <TouchableOpacity style={styles.selectedMember} onPress={() => setSelected(null)}>
                  <Text style={styles.selectedName}>{selected.user.fullName}</Text>
                  <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
              ) : (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="Search members…"
                    placeholderTextColor={COLORS.textMuted}
                    value={search}
                    onChangeText={setSearch}
                    autoFocus
                  />
                  <View style={styles.memberList}>
                    {filtered.map((m) => (
                      <TouchableOpacity key={m.id} style={styles.memberRow} onPress={() => setSelected(m)}>
                        <Text style={styles.memberName}>{m.user.fullName}</Text>
                        <Text style={styles.memberNo}>{m.membershipNumber}</Text>
                      </TouchableOpacity>
                    ))}
                    {filtered.length === 0 && <Text style={styles.noResults}>No members found</Text>}
                  </View>
                </>
              )}

              {selected && (
                <>
                  <Text style={styles.modalLabel}>Note (optional)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Reason for the award…"
                    placeholderTextColor={COLORS.textMuted}
                    value={notes}
                    onChangeText={setNotes}
                  />
                </>
              )}

              {error && <Text style={styles.error}>{error}</Text>}

              <TouchableOpacity
                style={[
                  styles.awardBtn,
                  { backgroundColor: theme.primary },
                  (!selected || awardMutation.isPending) && styles.awardBtnDisabled,
                ]}
                onPress={handleAward}
                disabled={!selected || awardMutation.isPending}
              >
                {awardMutation.isPending ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text style={styles.awardBtnText}>Award Badge</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

export default function StaffBadgesScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const badgesQ = useCustomBadges();
  const badges = badgesQ.data ?? [];
  const [awarding, setAwarding] = useState<CustomBadge | null>(null);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Award Badges</Text>
      </View>

      {badgesQ.isLoading ? (
        <View style={styles.centered}>
          <AppLoader />
        </View>
      ) : (
        <FlatList
          data={badges}
          keyExtractor={(item) => item.id}
          contentContainerStyle={badges.length === 0 ? styles.listEmpty : styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl refreshing={badgesQ.isRefetching} onRefresh={() => badgesQ.refetch()} tintColor={theme.primary} />
          }
          ListHeaderComponent={
            <Text style={styles.hint}>Badge types are created on the web dashboard.</Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.badgeCard} onPress={() => setAwarding(item)} activeOpacity={0.7}>
              <View style={[styles.badgeIcon, { backgroundColor: item.color + '22', borderColor: item.color + '55' }]}>
                <Text style={styles.badgeIconText}>{item.icon}</Text>
              </View>
              <View style={styles.badgeInfo}>
                <Text style={styles.badgeName}>{item.name}</Text>
                {item.description ? (
                  <Text style={styles.badgeDesc} numberOfLines={2}>{item.description}</Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.border} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="ribbon-outline" size={48} color={COLORS.border} />
              <Text style={styles.emptyTitle}>No custom badges yet</Text>
            </View>
          }
        />
      )}

      <AwardModal badge={awarding} onClose={() => setAwarding(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 52 : SPACING.lg,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { padding: 4, marginRight: 4 },
  screenTitle: { fontSize: 22, color: COLORS.text, ...FONT.bold },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: SPACING.lg },
  listEmpty: { flex: 1 },
  separator: { height: SPACING.md },
  hint: { fontSize: 12, color: COLORS.textMuted, ...FONT.regular, marginBottom: SPACING.md },

  badgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  badgeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeIconText: { fontSize: 20 },
  badgeInfo: { flex: 1, gap: 2 },
  badgeName: { fontSize: 15, color: COLORS.text, ...FONT.semibold },
  badgeDesc: { fontSize: 13, color: COLORS.textSecondary, ...FONT.regular },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: SPACING.sm },
  emptyTitle: { fontSize: 16, color: COLORS.textSecondary, ...FONT.semibold, marginTop: 8 },

  // Modal
  modalWrap: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    paddingBottom: Platform.OS === 'ios' ? 36 : SPACING.lg,
    gap: SPACING.sm,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, marginBottom: SPACING.sm },
  modalTitle: { fontSize: 18, color: COLORS.text, ...FONT.bold, marginBottom: SPACING.xs },
  modalLabel: { fontSize: 12, color: COLORS.textMuted, ...FONT.semibold, textTransform: 'uppercase', marginTop: SPACING.sm },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: 14,
    ...FONT.regular,
  },
  memberList: { gap: 2 },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  memberName: { fontSize: 14, color: COLORS.text, ...FONT.medium },
  memberNo: { fontSize: 12, color: COLORS.textMuted, ...FONT.regular },
  noResults: { fontSize: 13, color: COLORS.textMuted, paddingVertical: SPACING.md, textAlign: 'center' },
  selectedMember: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
  },
  selectedName: { fontSize: 14, color: COLORS.text, ...FONT.medium },
  error: { fontSize: 13, color: COLORS.error, marginTop: SPACING.xs },
  awardBtn: {
    marginTop: SPACING.md,
    paddingVertical: 14,
    borderRadius: RADIUS.button,
    alignItems: 'center',
  },
  awardBtnDisabled: { opacity: 0.4 },
  awardBtnText: { fontSize: 15, color: '#000', ...FONT.semibold },
  doneWrap: { alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.lg },
  doneText: { fontSize: 15, color: COLORS.text, ...FONT.medium, textAlign: 'center' },
});
