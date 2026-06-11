import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { staffService } from '../../services/staff.service';
import { COLORS, SPACING, RADIUS, FONT } from '../../constants/theme';
import type { StaffCheckIn, MemberListItem } from '../../types';

function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function formatElapsed(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function statusColor(status: MemberListItem['status']): string {
  if (status === 'ACTIVE') return COLORS.active;
  if (status === 'SUSPENDED') return COLORS.suspended;
  return COLORS.expired;
}

// ─── Active check-in row ────────────────────────────────────────────────────

function CheckInRow({
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
    <View style={styles.row}>
      <View style={styles.avatar}>
        <Text style={[styles.avatarText, { color: theme.primary }]}>{getInitials(item.member.user.fullName)}</Text>
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowName} numberOfLines={1}>{item.member.user.fullName}</Text>
        <Text style={styles.rowSub}>
          {item.member.membershipNumber} · In at {formatTime(item.checkedInAt)} · {formatElapsed(item.checkedInAt)}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.outBtn}
        onPress={() => onCheckOut(item.id)}
        disabled={checkingOut}
        activeOpacity={0.7}
      >
        {checkingOut ? (
          <ActivityIndicator size="small" color={COLORS.textMuted} />
        ) : (
          <>
            <Ionicons name="log-out-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.outBtnText}>Out</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ─── Member search row (inside modal) ───────────────────────────────────────

function MemberRow({
  item,
  onCheckIn,
  isLoading,
}: {
  item: MemberListItem;
  onCheckIn: (id: string) => void;
  isLoading: boolean;
}) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      style={styles.memberRow}
      onPress={() => onCheckIn(item.id)}
      disabled={isLoading}
      activeOpacity={0.7}
    >
      <View style={styles.memberAvatar}>
        <Text style={[styles.memberAvatarText, { color: theme.primary }]}>{getInitials(item.user.fullName)}</Text>
      </View>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName} numberOfLines={1}>{item.user.fullName}</Text>
        <Text style={styles.memberSub}>{item.membershipNumber}</Text>
      </View>
      <View style={[styles.statusDot, { backgroundColor: statusColor(item.status) }]} />
      {isLoading ? (
        <ActivityIndicator size="small" color={theme.primary} style={{ marginLeft: 8 }} />
      ) : (
        <Ionicons name="add-circle-outline" size={22} color={theme.primary} />
      )}
    </TouchableOpacity>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function CheckInsScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();

  // Active check-ins state
  const [activeList, setActiveList] = useState<StaffCheckIn[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [checkingOutId, setCheckingOutId] = useState<string | null>(null);

  // Check-in modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [members, setMembers] = useState<MemberListItem[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [checkingInId, setCheckingInId] = useState<string | null>(null);
  const [checkInError, setCheckInError] = useState<string | null>(null);

  const loadActiveList = useCallback(async () => {
    if (!user) return;
    try {
      const data = await staffService.getActiveCheckIns(user.gymId);
      setActiveList(data);
      setListError(null);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setListError(e?.message ?? 'Failed to load check-ins');
    } finally {
      setListLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadActiveList();
  }, [loadActiveList]);

  // ── Check-out ──────────────────────────────────────────────────────────────

  const handleCheckOut = async (checkinId: string) => {
    if (!user) return;
    setCheckingOutId(checkinId);
    setActiveList((prev) => prev.filter((c) => c.id !== checkinId));
    try {
      await staffService.checkOut(user.gymId, checkinId);
    } catch {
      loadActiveList(); // revert on failure
    } finally {
      setCheckingOutId(null);
    }
  };

  // ── Open modal + load members ──────────────────────────────────────────────

  const openModal = async () => {
    setModalVisible(true);
    setCheckInError(null);
    setSearchQuery('');
    if (members.length > 0) return; // already loaded
    if (!user) return;
    setMembersLoading(true);
    try {
      const res = await staffService.getMembers(user.gymId);
      setMembers(res.data);
    } catch {
      setCheckInError('Failed to load member list');
    } finally {
      setMembersLoading(false);
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setSearchQuery('');
    setCheckInError(null);
  };

  // ── Check-in a member ──────────────────────────────────────────────────────

  const handleCheckIn = async (memberId: string) => {
    if (!user) return;
    setCheckingInId(memberId);
    setCheckInError(null);
    try {
      await staffService.checkInManual(user.gymId, memberId);
      closeModal();
      await loadActiveList();
    } catch (err: unknown) {
      const e = err as { message?: string; code?: string };
      const msg =
        e.code === 'ALREADY_CHECKED_IN' ? 'Member is already checked in' :
        e.code === 'MEMBER_NOT_ACTIVE'   ? 'Member is not active' :
        e.code === 'MEMBERSHIP_EXPIRED'  ? 'Membership has expired' :
        e.message ?? 'Failed to check in member';
      setCheckInError(msg);
    } finally {
      setCheckingInId(null);
    }
  };

  // ── Filtered member list ───────────────────────────────────────────────────

  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;
    const q = searchQuery.toLowerCase();
    return members.filter(
      (m) =>
        m.user.fullName.toLowerCase().includes(q) ||
        m.membershipNumber.toLowerCase().includes(q),
    );
  }, [members, searchQuery]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.screenTitle}>Check-ins</Text>
          <Text style={styles.activeCount}>
            {activeList.length} active{activeList.length !== 1 ? '' : ''}
          </Text>
        </View>
        <TouchableOpacity style={[styles.checkInFab, { backgroundColor: theme.primary }]} onPress={openModal} activeOpacity={0.8}>
          <Ionicons name="person-add-outline" size={18} color="#000" />
          <Text style={styles.checkInFabText}>Check In</Text>
        </TouchableOpacity>
      </View>

      {/* Active list */}
      {listLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.primary} size="large" />
        </View>
      ) : listError ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{listError}</Text>
          <TouchableOpacity onPress={loadActiveList} style={styles.retryBtn}>
            <Text style={[styles.retryText, { color: theme.primary }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={activeList}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadActiveList(); }}
              tintColor={theme.primary}
            />
          }
          contentContainerStyle={activeList.length === 0 ? styles.listEmpty : styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle-outline" size={48} color={COLORS.border} />
              <Text style={styles.emptyTitle}>No one checked in</Text>
              <Text style={styles.emptySub}>Tap "Check In" to add a member</Text>
            </View>
          }
          renderItem={({ item }) => (
            <CheckInRow
              item={item}
              onCheckOut={handleCheckOut}
              checkingOut={checkingOutId === item.id}
            />
          )}
        />
      )}

      {/* Check-in modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          style={styles.modalWrap}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={styles.modalBackdrop} onPress={closeModal} />

          <View style={styles.modalSheet}>
            {/* Handle bar */}
            <View style={styles.modalHandle} />

            {/* Modal header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Check In Member</Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Search input */}
            <View style={styles.searchRow}>
              <Ionicons name="search-outline" size={18} color={COLORS.textMuted} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Name or membership number"
                placeholderTextColor={COLORS.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
                autoCapitalize="none"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Error */}
            {checkInError && (
              <View style={styles.modalError}>
                <Ionicons name="warning-outline" size={15} color={COLORS.warning} />
                <Text style={styles.modalErrorText}>{checkInError}</Text>
              </View>
            )}

            {/* Member list */}
            {membersLoading ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator color={theme.primary} />
              </View>
            ) : (
              <FlatList
                data={filteredMembers}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.memberListContent}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                ListEmptyComponent={
                  <View style={styles.modalEmpty}>
                    <Text style={styles.modalEmptyText}>
                      {searchQuery ? 'No members match your search' : 'No members found'}
                    </Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <MemberRow
                    item={item}
                    onCheckIn={handleCheckIn}
                    isLoading={checkingInId === item.id}
                  />
                )}
              />
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 52 : SPACING.lg,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  screenTitle: { fontSize: 26, color: COLORS.text, ...FONT.bold },
  activeCount: { fontSize: 13, color: COLORS.textMuted, ...FONT.regular, marginTop: 2 },

  checkInFab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.button,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  checkInFabText: { fontSize: 14, color: '#000', ...FONT.semibold },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.sm },
  errorText: { color: COLORS.error, fontSize: 14, textAlign: 'center' },
  retryBtn: { marginTop: 4 },
  retryText: { color: COLORS.primary, fontSize: 14, ...FONT.medium },

  listContent: { paddingVertical: SPACING.sm },
  listEmpty: { flex: 1 },
  separator: { height: 1, backgroundColor: COLORS.border, marginHorizontal: SPACING.lg },

  // Active check-in row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: 14,
    gap: SPACING.sm,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 14, color: COLORS.primary, ...FONT.semibold },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 15, color: COLORS.text, ...FONT.medium },
  rowSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  outBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 52,
    justifyContent: 'center',
  },
  outBtnText: { fontSize: 12, color: COLORS.textSecondary, ...FONT.medium },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: SPACING.sm,
  },
  emptyTitle: { fontSize: 16, color: COLORS.textSecondary, ...FONT.semibold, marginTop: 8 },
  emptySub: { fontSize: 13, color: COLORS.textMuted, ...FONT.regular },

  // Modal
  modalWrap: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    maxHeight: '82%',
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: 17, color: COLORS.text, ...FONT.semibold },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    marginHorizontal: SPACING.lg,
    marginVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    gap: SPACING.xs,
  },
  searchIcon: { marginLeft: 4 },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 15,
    color: COLORS.text,
    ...FONT.regular,
  },

  modalError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.warningBg,
    borderWidth: 1,
    borderColor: COLORS.warning,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
  },
  modalErrorText: { fontSize: 13, color: COLORS.warning, ...FONT.regular, flex: 1 },

  modalLoading: { paddingVertical: SPACING.xl, alignItems: 'center' },

  memberListContent: { paddingBottom: SPACING.lg },

  // Member row
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: 12,
    gap: SPACING.sm,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: { fontSize: 13, color: COLORS.primary, ...FONT.semibold },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 14, color: COLORS.text, ...FONT.medium },
  memberSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  modalEmpty: { paddingVertical: SPACING.xl, alignItems: 'center' },
  modalEmptyText: { fontSize: 14, color: COLORS.textMuted, ...FONT.regular },
});
