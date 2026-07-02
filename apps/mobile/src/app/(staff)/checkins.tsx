import React, { useCallback, useMemo, useRef, useState } from 'react';
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
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTheme } from '../../context/ThemeContext';
import {
  useActiveCheckIns,
  useCheckInManual,
  useCheckInQrScan,
  useCheckOut,
  useStaffMembers,
} from '../../hooks/staff';
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

// ─── QR Scanner ──────────────────────────────────────────────────────────────

function QrScannerTab({
  onSuccess,
  onError,
}: {
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const { theme } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const scannedRef = useRef(false);
  const qrScanMutation = useCheckInQrScan();

  const handleBarcode = useCallback(
    async ({ data }: { data: string }) => {
      if (scannedRef.current || scanning) return;
      scannedRef.current = true;
      setScanning(true);
      try {
        await qrScanMutation.mutateAsync(data);
        onSuccess();
      } catch (err: unknown) {
        const e = err as { code?: string; message?: string };
        const msg =
          e.code === 'ALREADY_CHECKED_IN' ? 'Member is already checked in' :
          e.code === 'MEMBER_NOT_ACTIVE'   ? 'Member is not active' :
          e.code === 'MEMBERSHIP_EXPIRED'  ? 'Membership has expired' :
          e.code === 'INVALID_QR'          ? 'Invalid or expired QR code' :
          e.message ?? 'Failed to check in member';
        onError(msg);
        setTimeout(() => { scannedRef.current = false; setScanning(false); }, 2000);
      }
    },
    [qrScanMutation, onSuccess, onError, scanning],
  );

  if (!permission) return <ActivityIndicator color={theme.primary} style={{ marginTop: SPACING.xl }} />;

  if (!permission.granted) {
    return (
      <View style={styles.cameraPermission}>
        <Ionicons name="camera-outline" size={40} color={COLORS.textMuted} />
        <Text style={styles.cameraPermissionText}>Camera access is needed to scan QR codes</Text>
        <TouchableOpacity style={[styles.permissionBtn, { backgroundColor: theme.primary }]} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>Allow Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.scannerWrap}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanning ? undefined : handleBarcode}
      />
      <View style={styles.scannerOverlay}>
        <View style={styles.scannerFrame}>
          <View style={[styles.corner, styles.cornerTL, { borderColor: theme.primary }]} />
          <View style={[styles.corner, styles.cornerTR, { borderColor: theme.primary }]} />
          <View style={[styles.corner, styles.cornerBL, { borderColor: theme.primary }]} />
          <View style={[styles.corner, styles.cornerBR, { borderColor: theme.primary }]} />
        </View>
      </View>
      {scanning && (
        <View style={styles.scanningIndicator}>
          <ActivityIndicator color="#fff" size="small" />
          <Text style={styles.scanningText}>Checking in…</Text>
        </View>
      )}
      <Text style={styles.scanHint}>Point the camera at a member's QR code</Text>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function CheckInsScreen() {
  const { theme } = useTheme();

  const activeListQ = useActiveCheckIns();
  const membersQ = useStaffMembers();
  const checkOutMutation = useCheckOut();
  const checkInManualMutation = useCheckInManual();

  const activeList: StaffCheckIn[] = activeListQ.data ?? [];
  const listLoading = activeListQ.isLoading;
  const refreshing = activeListQ.isRefetching;
  const listError = (activeListQ.error as { message?: string } | null)?.message ?? null;
  const checkingOutId = checkOutMutation.isPending
    ? checkOutMutation.variables ?? null
    : null;

  const members: MemberListItem[] = membersQ.data?.data ?? [];
  const membersLoading = membersQ.isFetching;
  const checkingInId = checkInManualMutation.isPending
    ? checkInManualMutation.variables ?? null
    : null;

  const [modalVisible, setModalVisible] = useState(false);
  const [modalTab, setModalTab] = useState<'search' | 'scan'>('scan');
  const [searchQuery, setSearchQuery] = useState('');
  const [checkInError, setCheckInError] = useState<string | null>(null);

  const handleCheckOut = (checkinId: string) => {
    checkOutMutation.mutate(checkinId);
  };

  const openModal = () => {
    setModalVisible(true);
    setModalTab('scan');
    setCheckInError(null);
    setSearchQuery('');
  };

  const loadMembersIfNeeded = () => {
    // Cached by TanStack Query — refetch only if stale or empty.
    if (membersQ.data) return;
    membersQ.refetch();
  };

  const closeModal = () => {
    setModalVisible(false);
    setSearchQuery('');
    setCheckInError(null);
  };

  const handleQrSuccess = useCallback(() => {
    closeModal();
  }, []);

  const handleQrError = useCallback((msg: string) => {
    setCheckInError(msg);
  }, []);

  const handleCheckIn = async (memberId: string) => {
    setCheckInError(null);
    try {
      await checkInManualMutation.mutateAsync(memberId);
      closeModal();
    } catch (err: unknown) {
      const e = err as { message?: string; code?: string };
      const msg =
        e.code === 'ALREADY_CHECKED_IN' ? 'Member is already checked in' :
        e.code === 'MEMBER_NOT_ACTIVE'   ? 'Member is not active' :
        e.code === 'MEMBERSHIP_EXPIRED'  ? 'Membership has expired' :
        e.message ?? 'Failed to check in member';
      setCheckInError(msg);
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
          <TouchableOpacity onPress={() => activeListQ.refetch()} style={styles.retryBtn}>
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
              onRefresh={() => activeListQ.refetch()}
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

            {/* Tab switcher */}
            <View style={styles.modalTabs}>
              <TouchableOpacity
                style={[styles.modalTab, modalTab === 'scan' && { borderBottomColor: theme.primary, borderBottomWidth: 2 }]}
                onPress={() => { setModalTab('scan'); setCheckInError(null); }}
              >
                <Ionicons name="qr-code-outline" size={16} color={modalTab === 'scan' ? theme.primary : COLORS.textMuted} />
                <Text style={[styles.modalTabText, modalTab === 'scan' && { color: theme.primary }]}>Scan QR</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalTab, modalTab === 'search' && { borderBottomColor: theme.primary, borderBottomWidth: 2 }]}
                onPress={() => { setModalTab('search'); setCheckInError(null); loadMembersIfNeeded(); }}
              >
                <Ionicons name="search-outline" size={16} color={modalTab === 'search' ? theme.primary : COLORS.textMuted} />
                <Text style={[styles.modalTabText, modalTab === 'search' && { color: theme.primary }]}>Search</Text>
              </TouchableOpacity>
            </View>

            {/* Error banner */}
            {checkInError && (
              <View style={styles.modalError}>
                <Ionicons name="warning-outline" size={15} color={COLORS.warning} />
                <Text style={styles.modalErrorText}>{checkInError}</Text>
              </View>
            )}

            {/* QR scanner */}
            {modalTab === 'scan' && (
              <QrScannerTab onSuccess={handleQrSuccess} onError={handleQrError} />
            )}

            {/* Member search */}
            {modalTab === 'search' && (
              <>
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
              </>
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

  // Modal tabs
  modalTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  modalTabText: {
    fontSize: 14,
    ...FONT.semibold,
    color: COLORS.textMuted,
  },

  // QR scanner
  scannerWrap: {
    height: 320,
    margin: SPACING.lg,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    backgroundColor: '#000',
    position: 'relative',
  },
  camera: { flex: 1 },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerFrame: {
    width: 200,
    height: 200,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#fff',
    borderWidth: 3,
  },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 4 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 4 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 4 },
  scanningIndicator: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  scanningText: { color: '#fff', fontSize: 14, ...FONT.medium },
  scanHint: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    ...FONT.regular,
    paddingBottom: 10,
  },

  // Camera permission
  cameraPermission: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  cameraPermissionText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    ...FONT.regular,
  },
  permissionBtn: {
    paddingVertical: 10,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.button,
  },
  permissionBtnText: { fontSize: 14, color: '#000', ...FONT.semibold },
});
