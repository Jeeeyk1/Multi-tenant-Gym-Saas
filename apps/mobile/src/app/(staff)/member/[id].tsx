import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { staffService } from '../../../services/staff.service';
import { COLORS, SPACING, RADIUS, FONT } from '../../../constants/theme';
import type { MemberDetail, RenewalRecord } from '../../../types';

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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function isExpired(iso: string): boolean {
  return new Date(iso) < new Date();
}

// ─── Renew Modal ─────────────────────────────────────────────────────────────

interface RenewModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (dto: {
    amountPaid: number;
    planId?: string;
    paymentMethod?: string;
    notes?: string;
  }) => Promise<void>;
  currentPlanId?: string;
  submitting: boolean;
}

function RenewModal({ visible, onClose, onSubmit, submitting }: RenewModalProps) {
  const { theme } = useTheme();
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setAmount('');
    setPaymentMethod('');
    setNotes('');
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    const parsed = parseFloat(amount);
    if (!amount.trim() || isNaN(parsed) || parsed <= 0) {
      setError('Enter a valid amount paid');
      return;
    }
    setError(null);
    await onSubmit({
      amountPaid: parsed,
      paymentMethod: paymentMethod.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    reset();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={handleClose} />
        <View style={styles.modalSheet}>
          {/* Handle */}
          <View style={styles.handle} />

          <Text style={styles.modalTitle}>Renew Membership</Text>

          {error && (
            <View style={styles.modalError}>
              <Text style={styles.modalErrorText}>{error}</Text>
            </View>
          )}

          <Text style={styles.fieldLabel}>Amount Paid *</Text>
          <TextInput
            style={styles.fieldInput}
            placeholder="e.g. 1500"
            placeholderTextColor={COLORS.textMuted}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            returnKeyType="next"
          />

          <Text style={styles.fieldLabel}>Payment Method</Text>
          <TextInput
            style={styles.fieldInput}
            placeholder="Cash, Card, GCash…"
            placeholderTextColor={COLORS.textMuted}
            value={paymentMethod}
            onChangeText={setPaymentMethod}
            returnKeyType="next"
            autoCapitalize="words"
          />

          <Text style={styles.fieldLabel}>Notes (optional)</Text>
          <TextInput
            style={[styles.fieldInput, styles.fieldInputMulti]}
            placeholder="Any notes about this renewal"
            placeholderTextColor={COLORS.textMuted}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            returnKeyType="done"
          />

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: theme.primary }, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={COLORS.onPrimary} />
            ) : (
              <Text style={styles.submitBtnText}>Confirm Renewal</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={handleClose} disabled={submitting}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Renewal Row ─────────────────────────────────────────────────────────────

function RenewalRow({ record }: { record: RenewalRecord }) {
  return (
    <View style={styles.renewalRow}>
      <View style={styles.renewalLeft}>
        <Text style={styles.renewalAmount}>
          {record.amountPaid.toLocaleString()}
          {record.paymentMethod ? ` · ${record.paymentMethod}` : ''}
        </Text>
        <Text style={styles.renewalDates}>
          {formatShortDate(record.previousExpiry)} → {formatShortDate(record.newExpiry)}
        </Text>
        {record.notes ? <Text style={styles.renewalNotes}>{record.notes}</Text> : null}
      </View>
      <View style={styles.renewalRight}>
        <Text style={styles.renewalBy}>{record.renewedByUser.fullName}</Text>
        <Text style={styles.renewalAt}>{formatShortDate(record.renewedAt)}</Text>
      </View>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function MemberDetailScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [member, setMember] = useState<MemberDetail | null>(null);
  const [renewals, setRenewals] = useState<RenewalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [actionLoading, setActionLoading] = useState(false);
  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [renewSubmitting, setRenewSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!user || !id) return;
    try {
      const [memberData, renewalData] = await Promise.all([
        staffService.getMember(user.gymId, id),
        staffService.listRenewals(user.gymId, id),
      ]);
      setMember(memberData);
      setRenewals(renewalData);
      setError(null);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message ?? 'Failed to load member');
    } finally {
      setIsLoading(false);
    }
  }, [user, id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSuspend = async () => {
    if (!user || !member) return;
    Alert.alert(
      'Suspend Member',
      `Suspend ${member.user.fullName}? They will not be able to check in.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Suspend',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await staffService.suspendMember(user.gymId, member.id);
              setMember((prev) => (prev ? { ...prev, status: 'SUSPENDED' } : prev));
            } catch (err: unknown) {
              const e = err as { message?: string };
              Alert.alert('Error', e?.message ?? 'Failed to suspend member');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleReactivate = async () => {
    if (!user || !member) return;
    setActionLoading(true);
    try {
      await staffService.reactivateMember(user.gymId, member.id);
      setMember((prev) => (prev ? { ...prev, status: 'ACTIVE' } : prev));
    } catch (err: unknown) {
      const e = err as { message?: string };
      Alert.alert('Error', e?.message ?? 'Failed to reactivate member');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRenew = async (dto: {
    amountPaid: number;
    planId?: string;
    paymentMethod?: string;
    notes?: string;
  }) => {
    if (!user || !member) return;
    setRenewSubmitting(true);
    try {
      await staffService.renewMembership(user.gymId, member.id, dto);
      setRenewModalOpen(false);
      // Reload to get updated expiry + new renewal record
      setIsLoading(true);
      await load();
    } catch (err: unknown) {
      const e = err as { message?: string };
      Alert.alert('Renewal Failed', e?.message ?? 'Could not process renewal');
    } finally {
      setRenewSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  if (error || !member) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={40} color={COLORS.error} />
        <Text style={styles.errorMsg}>{error ?? 'Member not found'}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
          <Text style={[styles.backLinkText, { color: theme.primary }]}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusColor = STATUS_COLOR[member.status] ?? COLORS.textMuted;
  const expired = isExpired(member.expiryDate);
  const canSuspend = member.status === 'ACTIVE';
  const canReactivate = member.status === 'SUSPENDED' || member.status === 'EXPIRED';

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Back header */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color={COLORS.text} />
            <Text style={styles.backLabel}>Members</Text>
          </TouchableOpacity>
        </View>

        {/* Profile header */}
        <View style={styles.profileSection}>
          <View style={[styles.bigAvatar, { borderColor: theme.primary }]}>
            <Text style={[styles.bigAvatarText, { color: theme.primary }]}>{getInitials(member.user.fullName)}</Text>
          </View>
          <Text style={styles.fullName}>{member.user.fullName}</Text>
          <Text style={styles.profileEmail}>{member.user.email}</Text>
          {member.user.phone ? (
            <Text style={styles.profilePhone}>{member.user.phone}</Text>
          ) : null}
          <Text style={styles.membershipNumber}>{member.membershipNumber}</Text>
        </View>

        {/* Status card */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Text style={styles.cardLabel}>STATUS</Text>
            <View style={[styles.statusBadge, { borderColor: statusColor }]}>
              <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                {member.status}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoGrid}>
            <View style={styles.infoCell}>
              <Text style={styles.infoLabel}>Expiry</Text>
              <Text style={[styles.infoValue, expired && member.status !== 'SUSPENDED' && styles.infoValueExpired]}>
                {formatDate(member.expiryDate)}
              </Text>
            </View>
            <View style={styles.infoCell}>
              <Text style={styles.infoLabel}>Joined</Text>
              <Text style={styles.infoValue}>{formatDate(member.joinedAt)}</Text>
            </View>
            <View style={styles.infoCell}>
              <Text style={styles.infoLabel}>Plan</Text>
              <Text style={styles.infoValue} numberOfLines={2}>
                {member.membershipPlan?.name ?? 'None'}
              </Text>
            </View>
            {member.membershipPlan && (
              <View style={styles.infoCell}>
                <Text style={styles.infoLabel}>Duration</Text>
                <Text style={styles.infoValue}>{member.membershipPlan.durationDays} days</Text>
              </View>
            )}
          </View>
        </View>

        {/* Actions */}
        <Text style={styles.sectionLabel}>ACTIONS</Text>
        <View style={styles.actionsCard}>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => setRenewModalOpen(true)}
            disabled={actionLoading}
            activeOpacity={0.75}
          >
            <View style={styles.actionIconWrap}>
              <Ionicons name="refresh-outline" size={18} color={theme.primary} />
            </View>
            <Text style={styles.actionText}>Renew Membership</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>

          {(canSuspend || canReactivate) && <View style={styles.divider} />}

          {canSuspend && (
            <TouchableOpacity
              style={styles.actionRow}
              onPress={handleSuspend}
              disabled={actionLoading}
              activeOpacity={0.75}
            >
              <View style={[styles.actionIconWrap, styles.actionIconWarning]}>
                {actionLoading ? (
                  <ActivityIndicator size="small" color={COLORS.warning} />
                ) : (
                  <Ionicons name="pause-circle-outline" size={18} color={COLORS.warning} />
                )}
              </View>
              <Text style={[styles.actionText, styles.actionTextWarning]}>Suspend Member</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}

          {canReactivate && (
            <TouchableOpacity
              style={styles.actionRow}
              onPress={handleReactivate}
              disabled={actionLoading}
              activeOpacity={0.75}
            >
              <View style={[styles.actionIconWrap, styles.actionIconActive]}>
                {actionLoading ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : (
                  <Ionicons name="play-circle-outline" size={18} color={theme.primary} />
                )}
              </View>
              <Text style={styles.actionText}>Reactivate Member</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Renewal history */}
        <Text style={styles.sectionLabel}>RENEWAL HISTORY</Text>
        {renewals.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={28} color={COLORS.border} />
            <Text style={styles.emptyText}>No renewals yet</Text>
          </View>
        ) : (
          <View style={styles.renewalList}>
            {renewals.map((record, index) => (
              <View key={record.id} style={index < renewals.length - 1 ? styles.divider : undefined}>
                <RenewalRow record={record} />
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <RenewModal
        visible={renewModalOpen}
        onClose={() => setRenewModalOpen(false)}
        onSubmit={handleRenew}
        currentPlanId={member.membershipPlan?.id}
        submitting={renewSubmitting}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingBottom: SPACING.xxl },
  centered: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  errorMsg: { fontSize: 15, color: COLORS.textSecondary, ...FONT.regular, textAlign: 'center' },
  backLink: { marginTop: SPACING.sm },
  backLinkText: { fontSize: 14, color: COLORS.primary, ...FONT.medium },

  // Top bar
  topBar: {
    paddingTop: Platform.OS === 'ios' ? 52 : SPACING.lg,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  backLabel: { fontSize: 16, color: COLORS.text, ...FONT.regular },

  // Profile header
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    gap: 4,
  },
  bigAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  bigAvatarText: { fontSize: 24, color: COLORS.primary, ...FONT.bold },
  fullName: { fontSize: 22, color: COLORS.text, ...FONT.bold, textAlign: 'center' },
  profileEmail: { fontSize: 13, color: COLORS.textMuted, ...FONT.regular },
  profilePhone: { fontSize: 13, color: COLORS.textMuted, ...FONT.regular },
  membershipNumber: {
    fontSize: 12,
    color: COLORS.textSecondary,
    ...FONT.medium,
    marginTop: 2,
    letterSpacing: 0.4,
  },

  // Status card
  statusCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
    padding: SPACING.md,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  cardLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    ...FONT.semibold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  statusBadgeText: { fontSize: 11, ...FONT.semibold, textTransform: 'uppercase', letterSpacing: 0.4 },

  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.sm },

  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginTop: SPACING.xs,
  },
  infoCell: { minWidth: '44%', flex: 1 },
  infoLabel: { fontSize: 11, color: COLORS.textMuted, ...FONT.regular, marginBottom: 3 },
  infoValue: { fontSize: 14, color: COLORS.text, ...FONT.medium },
  infoValueExpired: { color: COLORS.expired },

  // Section label
  sectionLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    ...FONT.semibold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
  },

  // Actions card
  actionsCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    gap: SPACING.sm,
  },
  actionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconWarning: { backgroundColor: COLORS.warningBg },
  actionIconActive: { backgroundColor: COLORS.successBg },
  actionText: { flex: 1, fontSize: 15, color: COLORS.text, ...FONT.medium },
  actionTextWarning: { color: COLORS.warning },

  // Renewal history
  renewalList: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    marginHorizontal: SPACING.lg,
    overflow: 'hidden',
    padding: SPACING.md,
  },
  renewalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    gap: SPACING.sm,
  },
  renewalLeft: { flex: 1, gap: 3 },
  renewalAmount: { fontSize: 14, color: COLORS.text, ...FONT.medium },
  renewalDates: { fontSize: 12, color: COLORS.textMuted, ...FONT.regular },
  renewalNotes: { fontSize: 12, color: COLORS.textSecondary, ...FONT.regular, fontStyle: 'italic' },
  renewalRight: { alignItems: 'flex-end', gap: 3 },
  renewalBy: { fontSize: 12, color: COLORS.textSecondary, ...FONT.regular },
  renewalAt: { fontSize: 11, color: COLORS.textMuted, ...FONT.regular },

  emptyCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    marginHorizontal: SPACING.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, ...FONT.regular },

  // Renew modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : SPACING.xl,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: 18,
    color: COLORS.text,
    ...FONT.bold,
    marginBottom: SPACING.md,
  },
  modalError: {
    backgroundColor: COLORS.errorBg,
    borderWidth: 1,
    borderColor: COLORS.error,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
  },
  modalErrorText: { color: COLORS.error, fontSize: 13 },

  fieldLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    ...FONT.medium,
    marginBottom: 6,
    marginTop: SPACING.sm,
  },
  fieldInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 11,
    fontSize: 14,
    color: COLORS.text,
    ...FONT.regular,
  },
  fieldInputMulti: {
    height: 72,
    textAlignVertical: 'top',
    paddingTop: 11,
  },

  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 15, color: COLORS.onPrimary, ...FONT.semibold },

  cancelBtn: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
    marginTop: SPACING.xs,
  },
  cancelBtnText: { fontSize: 14, color: COLORS.textMuted, ...FONT.regular },
});
