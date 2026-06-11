import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  TextInput,
  Switch,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { leaderboardService } from '../../services/leaderboard.service';
import { COLORS, SPACING, RADIUS, FONT } from '../../constants/theme';
import type { PrSubmission, Exercise, LeaderboardConfigItem } from '../../types';

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
  const { theme } = useTheme();

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
          <View style={[styles.statPill, styles.statPillAccent, { borderColor: theme.primary }]}>
            <Text style={[styles.statValue, { color: theme.primary }]}>
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
                  <ActivityIndicator size="small" color="#fff" />
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
  const { theme } = useTheme();
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
        trackColor={{ false: COLORS.border, true: theme.primary + '66' }}
        thumbColor={isActive ? theme.primary : COLORS.textMuted}
      />
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

type TabKey = 'pending' | 'config';

export default function StaffLeaderboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();

  const [activeTab, setActiveTab] = useState<TabKey>('pending');

  // ── Pending tab state ──────────────────────────────────────────────────────

  const [pending, setPending] = useState<PrSubmission[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [pendingRefreshing, setPendingRefreshing] = useState(false);
  const [pendingError, setPendingError] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  // ── Config tab state ───────────────────────────────────────────────────────

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [config, setConfig] = useState<LeaderboardConfigItem[]>([]);
  const [configLoading, setConfigLoading] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [localActive, setLocalActive] = useState<Record<string, boolean>>({});
  const [hasConfigChanges, setHasConfigChanges] = useState(false);

  // ── Load pending ───────────────────────────────────────────────────────────

  const loadPending = useCallback(async () => {
    if (!user) return;
    try {
      const data = await leaderboardService.getPendingSubmissions(user.gymId);
      setPending(data);
      setPendingError(null);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setPendingError(e?.message ?? 'Failed to load submissions');
    } finally {
      setPendingLoading(false);
      setPendingRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  // ── Load config ────────────────────────────────────────────────────────────

  const loadConfig = useCallback(async () => {
    if (!user || configLoaded) return;
    setConfigLoading(true);
    setConfigError(null);
    try {
      const [ex, cfg] = await Promise.all([
        leaderboardService.listExercises(user.gymId),
        leaderboardService.getLeaderboardConfig(user.gymId),
      ]);
      setExercises(ex);
      setConfig(cfg);
      const activeMap: Record<string, boolean> = {};
      ex.forEach((e) => { activeMap[e.id] = false; });
      cfg.forEach((c) => { activeMap[c.exercise.id] = c.isActive; });
      setLocalActive(activeMap);
      setConfigLoaded(true);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setConfigError(e?.message ?? 'Failed to load config');
    } finally {
      setConfigLoading(false);
    }
  }, [user, configLoaded]);

  useEffect(() => {
    if (activeTab === 'config') {
      loadConfig();
    }
  }, [activeTab, loadConfig]);

  // ── Approve ────────────────────────────────────────────────────────────────

  const handleApprove = async (submissionId: string) => {
    if (!user) return;
    setApprovingId(submissionId);
    setPending((prev) => prev.filter((s) => s.id !== submissionId));
    try {
      await leaderboardService.approveSubmission(user.gymId, submissionId);
    } catch {
      loadPending();
    } finally {
      setApprovingId(null);
    }
  };

  // ── Reject ─────────────────────────────────────────────────────────────────

  const handleReject = async (submissionId: string, reason: string) => {
    if (!user) return;
    setRejectingId(submissionId);
    setPending((prev) => prev.filter((s) => s.id !== submissionId));
    try {
      await leaderboardService.rejectSubmission(user.gymId, submissionId, reason);
    } catch {
      loadPending();
    } finally {
      setRejectingId(null);
    }
  };

  // ── Config toggle ──────────────────────────────────────────────────────────

  const handleToggle = (exerciseId: string, val: boolean) => {
    setLocalActive((prev) => ({ ...prev, [exerciseId]: val }));
    setHasConfigChanges(true);
  };

  // ── Save config ────────────────────────────────────────────────────────────

  const handleSaveConfig = async () => {
    if (!user) return;
    setConfigSaving(true);
    setConfigError(null);
    try {
      const configItems = config.map((c, idx) => ({
        exerciseId: c.exercise.id,
        isActive: localActive[c.exercise.id] ?? c.isActive,
        displayOrder: c.displayOrder ?? idx,
      }));
      // include exercises not yet in config
      exercises
        .filter((e) => !config.find((c) => c.exercise.id === e.id))
        .forEach((e, idx) => {
          if (localActive[e.id]) {
            configItems.push({ exerciseId: e.id, isActive: true, displayOrder: config.length + idx });
          }
        });

      const updated = await leaderboardService.updateLeaderboardConfig(user.gymId, configItems);
      setConfig(updated);
      setHasConfigChanges(false);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setConfigError(e?.message ?? 'Failed to save config');
    } finally {
      setConfigSaving(false);
    }
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
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
          <Text style={[styles.tabText, activeTab === 'pending' && { color: theme.primary }]}>
            Pending
            {pending.length > 0 ? ` (${pending.length})` : ''}
          </Text>
          {activeTab === 'pending' && <View style={[styles.tabUnderline, { backgroundColor: theme.primary }]} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'config' && styles.tabActive]}
          onPress={() => setActiveTab('config')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'config' && { color: theme.primary }]}>Config</Text>
          {activeTab === 'config' && <View style={[styles.tabUnderline, { backgroundColor: theme.primary }]} />}
        </TouchableOpacity>
      </View>

      {/* ── PENDING TAB ─────────────────────────────────────────────────── */}
      {activeTab === 'pending' && (
        <>
          {pendingLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator color={theme.primary} size="large" />
            </View>
          ) : pendingError ? (
            <View style={styles.centered}>
              <Text style={styles.errorText}>{pendingError}</Text>
              <TouchableOpacity onPress={loadPending} style={styles.retryBtn}>
                <Text style={[styles.retryText, { color: theme.primary }]}>Retry</Text>
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
                  onRefresh={() => { setPendingRefreshing(true); loadPending(); }}
                  tintColor={theme.primary}
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
              <ActivityIndicator color={theme.primary} size="large" />
            </View>
          ) : configError ? (
            <View style={styles.centered}>
              <Text style={styles.errorText}>{configError}</Text>
              <TouchableOpacity
                onPress={() => { setConfigLoaded(false); loadConfig(); }}
                style={styles.retryBtn}
              >
                <Text style={[styles.retryText, { color: theme.primary }]}>Retry</Text>
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
                    style={[styles.saveBtn, { backgroundColor: theme.primary }]}
                    onPress={handleSaveConfig}
                    disabled={configSaving}
                    activeOpacity={0.8}
                  >
                    {configSaving ? (
                      <ActivityIndicator size="small" color="#000" />
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
    paddingTop: Platform.OS === 'ios' ? 52 : SPACING.lg,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { padding: 4, marginRight: 4 },
  headerTitle: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  screenTitle: { fontSize: 22, color: COLORS.text, ...FONT.bold },
  badge: {
    backgroundColor: COLORS.error,
    borderRadius: RADIUS.full,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: { fontSize: 11, color: '#fff', ...FONT.bold },

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
    borderRadius: RADIUS.lg,
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
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.full,
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
    borderRadius: RADIUS.md,
    paddingVertical: 10,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
  },
  actionBtnText: { fontSize: 14, ...FONT.semibold },

  // Reject input
  rejectInputWrap: { marginTop: SPACING.sm, gap: SPACING.sm },
  rejectInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.error,
    borderRadius: RADIUS.md,
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
    borderRadius: RADIUS.md,
  },
  rejectCancelText: { fontSize: 14, color: COLORS.textSecondary, ...FONT.medium },
  rejectConfirmBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: COLORS.error,
    borderRadius: RADIUS.md,
  },
  rejectConfirmText: { fontSize: 14, color: '#fff', ...FONT.semibold },
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
    borderRadius: RADIUS.lg,
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
    borderRadius: RADIUS.button,
    alignItems: 'center',
  },
  saveBtnText: { fontSize: 15, color: '#000', ...FONT.semibold },
});
