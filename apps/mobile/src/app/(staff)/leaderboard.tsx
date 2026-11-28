import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, ActivityIndicator, TouchableOpacity, Image, TextInput, Switch, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../../components/Text';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppLoader } from '../../components/AppLoader';
import {
  useApproveSubmission,
  useExercises,
  useLeaderboardConfig,
  usePendingSubmissions,
  useRejectSubmission,
  useUpdateLeaderboardConfig,
} from '../../hooks/leaderboard';
import { STAFF_COLORS as COLORS, SPACING, RADIUS, FONT, STAFF_SURFACE_RAISED } from '../../constants/theme';
import type { PrSubmission, Exercise } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Permission } from '../../constants/enums';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const CATEGORY_ORDER = ['CHEST', 'BACK', 'LEGS', 'SHOULDERS', 'ARMS'];

// ─── Pending submission card ──────────────────────────────────────────────────

function SubmissionCard({
  item,
  onApprove,
  onReject,
  approving,
  rejecting,
}: {
  item: PrSubmission;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  approving: boolean;
  rejecting: boolean;
}) {
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [reason, setReason] = useState('');

  const handleRejectConfirm = () => {
    const r = reason.trim();
    if (!r) return;
    onReject(item.id, r);
  };

  return (
    <View style={styles.card}>
      {/* Photo */}
      <Image
        source={{ uri: item.photoUrl }}
        style={styles.photo}
        resizeMode="cover"
      />

      {/* Content */}
      <View style={styles.cardBody}>
        {/* Member + exercise */}
        <Text style={styles.cardName} numberOfLines={1}>
          {item.member.user.fullName}
        </Text>
        <Text style={styles.cardExercise}>{item.exercise.name}</Text>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <Text style={styles.statValue}>{item.weightKg} kg</Text>
          </View>
          <Text style={styles.statSep}>×</Text>
          <View style={styles.statPill}>
            <Text style={styles.statValue}>{item.reps} reps</Text>
          </View>
          <View style={[styles.statPill, styles.statPillAccent, { borderColor: COLORS.primary }]}>
            <Text style={[styles.statValue, { color: COLORS.primary }]}>
              ~{item.estimated1rm} kg 1RM
            </Text>
          </View>
        </View>

        {/* Notes */}
        {item.notes ? (
          <Text style={styles.cardNotes} numberOfLines={2}>{item.notes}</Text>
        ) : null}

        <Text style={styles.cardDate}>{formatDate(item.submittedAt)}</Text>

        {/* Reject reason input */}
        {showRejectInput && (
          <View style={styles.rejectInputWrap}>
            <TextInput
              style={styles.rejectInput}
              placeholder="Rejection reason (required)"
              placeholderTextColor={COLORS.textMuted}
              value={reason}
              onChangeText={setReason}
              multiline
              autoFocus
              returnKeyType="done"
            />
            <View style={styles.rejectActions}>
              <TouchableOpacity
                style={styles.rejectCancelBtn}
                onPress={() => { setShowRejectInput(false); setReason(''); }}
              >
                <Text style={styles.rejectCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.rejectConfirmBtn, !reason.trim() && styles.btnDisabled]}
                onPress={handleRejectConfirm}
                disabled={!reason.trim() || rejecting}
              >
                {rejecting ? (
                  <ActivityIndicator size="small" color={COLORS.onPrimary} />
                ) : (
                  <Text style={styles.rejectConfirmText}>Reject</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Action buttons */}
        {!showRejectInput && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.approveBtn, { backgroundColor: COLORS.successBg, borderColor: COLORS.success }]}
              onPress={() => onApprove(item.id)}
              disabled={approving || rejecting}
              activeOpacity={0.7}
            >
              {approving ? (
                <ActivityIndicator size="small" color={COLORS.success} />
              ) : (
                <>
                  <Ionicons name="checkmark" size={14} color={COLORS.success} />
                  <Text style={[styles.actionBtnText, { color: COLORS.success }]}>Approve</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.rejectBtn, { backgroundColor: COLORS.errorBg, borderColor: COLORS.error }]}
              onPress={() => setShowRejectInput(true)}
              disabled={approving || rejecting}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={14} color={COLORS.error} />
              <Text style={[styles.actionBtnText, { color: COLORS.error }]}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Config row ───────────────────────────────────────────────────────────────

function ExerciseConfigRow({
  exercise,
  isActive,
  onToggle,
}: {
  exercise: Exercise;
  isActive: boolean;
  onToggle: (id: string, val: boolean) => void;
}) {
  return (
    <View style={styles.configRow}>
      <View style={styles.configInfo}>
        <Text style={styles.configName}>{exercise.name}</Text>
        {exercise.gymId === null && (
          <Text style={styles.configGlobal}>Global</Text>
        )}
      </View>
      <Switch
        value={isActive}
        onValueChange={(v) => onToggle(exercise.id, v)}
        trackColor={{ false: COLORS.border, true: COLORS.primary + '66' }}
        thumbColor={isActive ? COLORS.primary : COLORS.textMuted}
      />
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

type TabKey = 'pending' | 'config';

export default function StaffLeaderboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabKey>('pending');
  // Config saves need leaderboard.manage (Owner; Staff unless the owner switched it off).
  const canConfigure = useAuth().can(Permission.LEADERBOARD_MANAGE);

  // ── Pending tab ────────────────────────────────────────────────────────────

  const pendingQ = usePendingSubmissions();
  const approveMutation = useApproveSubmission();
  const rejectMutation = useRejectSubmission();
  const pending: PrSubmission[] = pendingQ.data ?? [];
  const pendingLoading = pendingQ.isLoading;
  const pendingRefreshing = pendingQ.isRefetching;
  const pendingError =
    (pendingQ.error as { message?: string } | null)?.message ?? null;
  const approvingId = approveMutation.isPending ? approveMutation.variables ?? null : null;
  const rejectingId = rejectMutation.isPending
    ? rejectMutation.variables?.submissionId ?? null
    : null;

  // ── Config tab ─────────────────────────────────────────────────────────────

  const exercisesQ = useExercises();
  const configQ = useLeaderboardConfig(activeTab === 'config');
  const updateConfigMutation = useUpdateLeaderboardConfig();
  const exercises: Exercise[] = exercisesQ.data ?? [];
  const config = configQ.data ?? [];
  const configLoading =
    activeTab === 'config' && (exercisesQ.isLoading || configQ.isLoading);
  const configSaving = updateConfigMutation.isPending;
  const configError =
    (exercisesQ.error as { message?: string } | null)?.message ??
    (configQ.error as { message?: string } | null)?.message ??
    (updateConfigMutation.error as { message?: string } | null)?.message ??
    null;
  const [localActive, setLocalActive] = useState<Record<string, boolean>>({});
  const [hasConfigChanges, setHasConfigChanges] = useState(false);

  useEffect(() => {
    if (!configQ.data || !exercisesQ.data) return;
    const activeMap: Record<string, boolean> = {};
    exercisesQ.data.forEach((e) => { activeMap[e.id] = false; });
    configQ.data.forEach((c) => { activeMap[c.exercise.id] = c.isActive; });
    setLocalActive(activeMap);
    setHasConfigChanges(false);
  }, [configQ.data, exercisesQ.data]);

  // ── Approve ────────────────────────────────────────────────────────────────

  const handleApprove = (submissionId: string) => {
    approveMutation.mutate(submissionId);
  };

  // ── Reject ─────────────────────────────────────────────────────────────────

  const handleReject = (submissionId: string, reason: string) => {
    rejectMutation.mutate({ submissionId, reason });
  };

  // ── Config toggle ──────────────────────────────────────────────────────────

  const handleToggle = (exerciseId: string, val: boolean) => {
    setLocalActive((prev) => ({ ...prev, [exerciseId]: val }));
    setHasConfigChanges(true);
  };

  // ── Save config ────────────────────────────────────────────────────────────

  const handleSaveConfig = () => {
    const configItems = config.map((c, idx) => ({
      exerciseId: c.exercise.id,
      isActive: localActive[c.exercise.id] ?? c.isActive,
      displayOrder: c.displayOrder ?? idx,
    }));
    exercises
      .filter((e) => !config.find((c) => c.exercise.id === e.id))
      .forEach((e, idx) => {
        if (localActive[e.id]) {
          configItems.push({ exerciseId: e.id, isActive: true, displayOrder: config.length + idx });
        }
      });

    updateConfigMutation.mutate(configItems, {
      onSuccess: () => setHasConfigChanges(false),
    });
  };

  // ── Group exercises by category ────────────────────────────────────────────

  const exercisesByCategory = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    items: exercises.filter((e) => e.category === cat),
  })).filter((g) => g.items.length > 0);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.screenTitle}>Leaderboard</Text>
          {pending.length > 0 && activeTab !== 'pending' && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pending.length}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
          onPress={() => setActiveTab('pending')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && { color: COLORS.primary }]}>
            Pending
            {pending.length > 0 ? ` (${pending.length})` : ''}
          </Text>
          {activeTab === 'pending' && <View style={[styles.tabUnderline, { backgroundColor: COLORS.primary }]} />}
        </TouchableOpacity>
        {canConfigure && (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'config' && styles.tabActive]}
            onPress={() => setActiveTab('config')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'config' && { color: COLORS.primary }]}>Config</Text>
            {activeTab === 'config' && <View style={[styles.tabUnderline, { backgroundColor: COLORS.primary }]} />}
          </TouchableOpacity>
        )}
      </View>

      {/* ── PENDING TAB ─────────────────────────────────────────────────── */}
      {activeTab === 'pending' && (
        <>
          {pendingLoading ? (
            <View style={styles.centered}>
              <AppLoader />
            </View>
          ) : pendingError ? (
            <View style={styles.centered}>
              <Text style={styles.errorText}>{pendingError}</Text>
              <TouchableOpacity onPress={() => pendingQ.refetch()} style={styles.retryBtn}>
                <Text style={[styles.retryText, { color: COLORS.primary }]}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={pending}
              keyExtractor={(item) => item.id}
              contentContainerStyle={pending.length === 0 ? styles.listEmpty : styles.listContent}
              refreshControl={
                <RefreshControl
                  refreshing={pendingRefreshing}
                  onRefresh={() => pendingQ.refetch()}
                  tintColor={COLORS.primary}
                />
              }
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="checkmark-done-circle-outline" size={48} color={COLORS.border} />
                  <Text style={styles.emptyTitle}>All caught up</Text>
                  <Text style={styles.emptySub}>No pending PR submissions</Text>
                </View>
              }
              renderItem={({ item }) => (
                <SubmissionCard
                  item={item}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  approving={approvingId === item.id}
                  rejecting={rejectingId === item.id}
                />
              )}
            />
          )}
        </>
      )}

      {/* ── CONFIG TAB ──────────────────────────────────────────────────── */}
      {activeTab === 'config' && (
        <View style={styles.configContainer}>
          {configLoading ? (
            <View style={styles.centered}>
              <AppLoader />
            </View>
          ) : configError ? (
            <View style={styles.centered}>
              <Text style={styles.errorText}>{configError}</Text>
              <TouchableOpacity
                onPress={() => { exercisesQ.refetch(); configQ.refetch(); }}
                style={styles.retryBtn}
              >
                <Text style={[styles.retryText, { color: COLORS.primary }]}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <ScrollView
                style={styles.configScroll}
                contentContainerStyle={styles.configScrollContent}
                showsVerticalScrollIndicator={false}
              >
                {exercisesByCategory.map((group) => (
                  <View key={group.category} style={styles.categorySection}>
                    <Text style={styles.categoryLabel}>{group.category}</Text>
                    <View style={styles.categoryCard}>
                      {group.items.map((ex, idx) => (
                        <View
                          key={ex.id}
                          style={idx < group.items.length - 1 ? styles.configRowBorder : undefined}
                        >
                          <ExerciseConfigRow
                            exercise={ex}
                            isActive={localActive[ex.id] ?? false}
                            onToggle={handleToggle}
                          />
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </ScrollView>

              {/* Save button */}
              {hasConfigChanges && (
                <View style={styles.saveBar}>
                  <TouchableOpacity
                    style={[styles.saveBtn, { backgroundColor: COLORS.primary }]}
                    onPress={handleSaveConfig}
                    disabled={configSaving}
                    activeOpacity={0.8}
                  >
                    {configSaving ? (
                      <ActivityIndicator size="small" color={COLORS.onPrimary} />
                    ) : (
                      <Text style={styles.saveBtnText}>Save Changes</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  // 44pt tap target; pulled left so the arrow lines up with the content edge.
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -10, marginRight: -6 },
  headerTitle: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  screenTitle: { fontSize: 22, color: COLORS.text, ...FONT.bold },
  badge: {
    backgroundColor: COLORS.error,
    borderRadius: RADIUS.pill,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: { fontSize: 11, color: COLORS.onPrimary, ...FONT.semibold },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    position: 'relative',
  },
  tabActive: {},
  tabText: { fontSize: 14, color: COLORS.textMuted, ...FONT.medium },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
    height: 2,
    borderRadius: 1,
  },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.sm },
  errorText: { color: COLORS.error, fontSize: 14, textAlign: 'center' },
  retryBtn: { marginTop: 4 },
  retryText: { fontSize: 14, ...FONT.medium },

  listContent: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  listEmpty: { flex: 1 },
  separator: { height: SPACING.md },

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

  // Submission card
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: 200,
    backgroundColor: COLORS.border,
  },
  cardBody: {
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  cardName: { fontSize: 16, color: COLORS.text, ...FONT.semibold },
  cardExercise: { fontSize: 13, color: COLORS.textMuted, ...FONT.regular },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  statPill: {
    backgroundColor: STAFF_SURFACE_RAISED,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statPillAccent: { borderColor: COLORS.primary },
  statValue: { fontSize: 12, color: COLORS.text, ...FONT.medium },
  statSep: { fontSize: 12, color: COLORS.textMuted },
  cardNotes: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  cardDate: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },

  // Action buttons
  actionRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  approveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: RADIUS.control,
    paddingVertical: 10,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: RADIUS.control,
    paddingVertical: 10,
  },
  actionBtnText: { fontSize: 14, ...FONT.semibold },

  // Reject input
  rejectInputWrap: { marginTop: SPACING.sm, gap: SPACING.sm },
  rejectInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.error,
    borderRadius: RADIUS.control,
    padding: SPACING.sm,
    color: COLORS.text,
    fontSize: 14,
    minHeight: 70,
    textAlignVertical: 'top',
    ...FONT.regular,
  },
  rejectActions: { flexDirection: 'row', gap: SPACING.sm },
  rejectCancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.control,
  },
  rejectCancelText: { fontSize: 14, color: COLORS.text, ...FONT.semibold },
  rejectConfirmBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: COLORS.error,
    borderRadius: RADIUS.control,
  },
  rejectConfirmText: { fontSize: 14, color: COLORS.onPrimary, ...FONT.semibold },
  btnDisabled: { opacity: 0.4 },

  // Config tab
  configContainer: { flex: 1 },
  configScroll: { flex: 1 },
  configScrollContent: { padding: SPACING.lg, paddingBottom: SPACING.xxl },

  categorySection: { marginBottom: SPACING.lg },
  categoryLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    ...FONT.semibold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: SPACING.sm,
  },
  categoryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  configRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
  },
  configRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  configInfo: { flex: 1, gap: 2 },
  configName: { fontSize: 14, color: COLORS.text, ...FONT.medium },
  configGlobal: { fontSize: 11, color: COLORS.textMuted, ...FONT.regular },

  saveBar: {
    padding: SPACING.lg,
    paddingBottom: Platform.OS === 'ios' ? 32 : SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  saveBtn: {
    paddingVertical: 14,
    borderRadius: RADIUS.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: { fontSize: 15, color: COLORS.onPrimary, ...FONT.semibold },
});
