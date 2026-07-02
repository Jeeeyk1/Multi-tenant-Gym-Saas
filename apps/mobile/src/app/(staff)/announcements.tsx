import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import {
  useArchiveStaffAnnouncement,
  useCreateStaffAnnouncement,
  useStaffAnnouncements,
} from '../../hooks/staff';
import { COLORS, SPACING, RADIUS, FONT } from '../../constants/theme';
import type { StaffAnnouncement } from '../../types';

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_TABS = [
  { key: undefined, label: 'All' },
  { key: 'PUBLISHED', label: 'Published' },
  { key: 'SCHEDULED', label: 'Scheduled' },
  { key: 'ARCHIVED', label: 'Archived' },
] as const;

const STATUS_COLOR: Record<string, string> = {
  PUBLISHED: COLORS.active,
  SCHEDULED: COLORS.secondary,
  EXPIRED: COLORS.expired,
  ARCHIVED: COLORS.textMuted,
  DRAFT: COLORS.textMuted,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Produces a local ISO-like string for display in inputs: "YYYY-MM-DDTHH:MM"
function toLocalISOString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Parse a "YYYY-MM-DDTHH:MM" or "YYYY-MM-DD" input into an ISO string, or null if invalid
function parseScheduleInput(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const d = new Date(trimmed);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

// ─── Create Modal ─────────────────────────────────────────────────────────────

interface CreateModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (dto: {
    title: string;
    content: string;
    isPinned: boolean;
    publishAt?: string;
    expiresAt?: string;
  }) => Promise<void>;
  submitting: boolean;
}

function CreateModal({ visible, onClose, onSubmit, submitting }: CreateModalProps) {
  const { theme } = useTheme();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [scheduleMode, setScheduleMode] = useState(false);
  const [publishAtInput, setPublishAtInput] = useState('');
  const [expiresAtInput, setExpiresAtInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setTitle('');
    setContent('');
    setIsPinned(false);
    setScheduleMode(false);
    setPublishAtInput('');
    setExpiresAtInput('');
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (!content.trim()) {
      setError('Content is required');
      return;
    }

    let publishAt: string | undefined;
    let expiresAt: string | undefined;

    if (scheduleMode && publishAtInput.trim()) {
      const parsed = parseScheduleInput(publishAtInput);
      if (!parsed) {
        setError('Invalid publish date. Use YYYY-MM-DD or YYYY-MM-DDTHH:MM');
        return;
      }
      publishAt = parsed;
    }

    if (expiresAtInput.trim()) {
      const parsed = parseScheduleInput(expiresAtInput);
      if (!parsed) {
        setError('Invalid expiry date. Use YYYY-MM-DD or YYYY-MM-DDTHH:MM');
        return;
      }
      expiresAt = parsed;
    }

    setError(null);
    await onSubmit({ title: title.trim(), content: content.trim(), isPinned, publishAt, expiresAt });
    reset();
  };

  const nowPlaceholder = toLocalISOString(new Date());

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={handleClose} />
        <View style={styles.modalSheet}>
          <View style={styles.handle} />
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>New Announcement</Text>

            {error && (
              <View style={styles.modalError}>
                <Text style={styles.modalErrorText}>{error}</Text>
              </View>
            )}

            <Text style={styles.fieldLabel}>Title *</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="e.g. Gym closed this Saturday"
              placeholderTextColor={COLORS.textMuted}
              value={title}
              onChangeText={setTitle}
              returnKeyType="next"
              maxLength={120}
            />

            <Text style={styles.fieldLabel}>Content *</Text>
            <TextInput
              style={[styles.fieldInput, styles.fieldInputMulti]}
              placeholder="Write your announcement here…"
              placeholderTextColor={COLORS.textMuted}
              value={content}
              onChangeText={setContent}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            {/* Pin toggle */}
            <TouchableOpacity
              style={styles.toggleRow}
              onPress={() => setIsPinned((v) => !v)}
              activeOpacity={0.75}
            >
              <View style={[styles.checkbox, isPinned && styles.checkboxActive, isPinned && { backgroundColor: theme.primary, borderColor: theme.primary }]}>
                {isPinned && <Ionicons name="checkmark" size={13} color={COLORS.onPrimary} />}
              </View>
              <View>
                <Text style={styles.toggleLabel}>Pin this announcement</Text>
                <Text style={styles.toggleSub}>Pinned posts appear at the top of the list</Text>
              </View>
            </TouchableOpacity>

            {/* Schedule toggle */}
            <TouchableOpacity
              style={styles.toggleRow}
              onPress={() => setScheduleMode((v) => !v)}
              activeOpacity={0.75}
            >
              <View style={[styles.checkbox, scheduleMode && styles.checkboxActive, scheduleMode && { backgroundColor: theme.primary, borderColor: theme.primary }]}>
                {scheduleMode && <Ionicons name="checkmark" size={13} color={COLORS.onPrimary} />}
              </View>
              <View>
                <Text style={styles.toggleLabel}>Schedule for later</Text>
                <Text style={styles.toggleSub}>Leave unchecked to publish immediately</Text>
              </View>
            </TouchableOpacity>

            {scheduleMode && (
              <>
                <Text style={styles.fieldLabel}>Publish At</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder={nowPlaceholder}
                  placeholderTextColor={COLORS.textMuted}
                  value={publishAtInput}
                  onChangeText={setPublishAtInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
                <Text style={styles.fieldHint}>Format: YYYY-MM-DD or YYYY-MM-DDTHH:MM</Text>
              </>
            )}

            <Text style={styles.fieldLabel}>Expires At (optional)</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="e.g. 2026-12-31"
              placeholderTextColor={COLORS.textMuted}
              value={expiresAtInput}
              onChangeText={setExpiresAtInput}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
            />
            <Text style={styles.fieldHint}>Leave empty for no expiry</Text>

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: theme.primary }, submitting && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={COLORS.onPrimary} />
              ) : (
                <Text style={styles.submitBtnText}>
                  {scheduleMode ? 'Schedule Announcement' : 'Publish Now'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={handleClose}
              disabled={submitting}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Announcement Card ────────────────────────────────────────────────────────

function AnnouncementCard({
  item,
  onArchive,
  archiving,
}: {
  item: StaffAnnouncement;
  onArchive: (id: string) => void;
  archiving: boolean;
}) {
  const statusColor = STATUS_COLOR[item.status] ?? COLORS.textMuted;
  const canArchive = item.status === 'PUBLISHED' || item.status === 'SCHEDULED';
  const { theme } = useTheme();

  return (
    <View style={styles.card}>
      {/* Card header */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          {item.isPinned && (
            <Ionicons
              name="pin"
              size={13}
              color={theme.primary}
              style={styles.pinIcon}
            />
          )}
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </Text>
        </View>
        <View style={[styles.statusBadge, { borderColor: statusColor }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
        </View>
      </View>

      {/* Content preview */}
      <Text style={styles.cardContent} numberOfLines={3}>
        {item.content}
      </Text>

      {/* Meta row */}
      <View style={styles.cardMeta}>
        <Text style={styles.cardMetaText}>
          {item.publishAt
            ? `${item.status === 'SCHEDULED' ? 'Scheduled: ' : 'Published: '}${formatDateTime(item.publishAt)}`
            : `Created: ${formatDate(item.createdAt)}`}
        </Text>
        {item.expiresAt && (
          <Text style={styles.cardMetaText}>Expires: {formatDate(item.expiresAt)}</Text>
        )}
      </View>

      {/* Footer */}
      <View style={styles.cardFooter}>
        <Text style={styles.cardAuthor}>By {item.createdByUser.fullName}</Text>
        {canArchive && (
          <TouchableOpacity
            style={styles.archiveBtn}
            onPress={() => onArchive(item.id)}
            disabled={archiving}
            activeOpacity={0.75}
          >
            {archiving ? (
              <ActivityIndicator size="small" color={COLORS.textMuted} />
            ) : (
              <>
                <Ionicons name="archive-outline" size={13} color={COLORS.textMuted} />
                <Text style={styles.archiveBtnText}>Archive</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function AnnouncementsScreen() {
  const { theme } = useTheme();
  const announcementsQ = useStaffAnnouncements();
  const createMutation = useCreateStaffAnnouncement();
  const archiveMutation = useArchiveStaffAnnouncement();

  const announcements: StaffAnnouncement[] = announcementsQ.data ?? [];
  const isLoading = announcementsQ.isLoading;
  const refreshing = announcementsQ.isRefetching;
  const error =
    (announcementsQ.error as { message?: string } | null)?.message ?? null;
  const createSubmitting = createMutation.isPending;
  const archivingId = archiveMutation.isPending
    ? archiveMutation.variables ?? null
    : null;

  const [activeTab, setActiveTab] = useState<string | undefined>(undefined);
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!activeTab) return announcements;
    return announcements.filter((a) => a.status === activeTab);
  }, [announcements, activeTab]);

  const handleCreate = async (dto: {
    title: string;
    content: string;
    isPinned: boolean;
    publishAt?: string;
    expiresAt?: string;
  }) => {
    try {
      await createMutation.mutateAsync(dto);
      setCreateOpen(false);
    } catch (err) {
      const e = err as { message?: string };
      Alert.alert('Error', e?.message ?? 'Failed to create announcement');
      throw err;
    }
  };

  const handleArchive = (id: string) => {
    Alert.alert(
      'Archive Announcement',
      'This will hide the announcement from members. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: () => {
            archiveMutation.mutate(id, {
              onError: (err: unknown) => {
                const e = err as { message?: string };
                Alert.alert('Error', e?.message ?? 'Failed to archive');
              },
            });
          },
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  return (
    <>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.screenTitle}>Announcements</Text>
            <Text style={styles.subCount}>{announcements.length} total</Text>
          </View>
          <TouchableOpacity
            style={[styles.newBtn, { backgroundColor: theme.primary }]}
            onPress={() => setCreateOpen(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={18} color={COLORS.onPrimary} />
            <Text style={styles.newBtnText}>New</Text>
          </TouchableOpacity>
        </View>

        {/* Status filter tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
          style={styles.tabsScroll}
        >
          {STATUS_TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.label}
                style={[styles.tab, isActive && styles.tabActive, isActive && { borderColor: theme.primary }]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.75}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive, isActive && { color: theme.primary }]}>
                  {tab.label}
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

        {/* List */}
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <AnnouncementCard
              item={item}
              onArchive={handleArchive}
              archiving={archivingId === item.id}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => announcementsQ.refetch()}
              tintColor={theme.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="megaphone-outline" size={36} color={COLORS.border} />
              <Text style={styles.emptyText}>
                {activeTab ? `No ${activeTab.toLowerCase()} announcements` : 'No announcements yet'}
              </Text>
              {!activeTab && (
                <TouchableOpacity
                  style={styles.emptyAction}
                  onPress={() => setCreateOpen(true)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.emptyActionText, { color: theme.primary }]}>Create your first one</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </View>

      <CreateModal
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        submitting={createSubmitting}
      />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 48 : SPACING.lg,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  screenTitle: { fontSize: 28, color: COLORS.text, ...FONT.bold },
  subCount: { fontSize: 13, color: COLORS.textMuted, ...FONT.regular, marginTop: 2 },

  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    gap: 5,
    marginBottom: 4,
  },
  newBtnText: { fontSize: 14, color: COLORS.onPrimary, ...FONT.semibold },

  // Tabs
  tabsScroll: { flexGrow: 0 },
  tabsRow: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
    gap: SPACING.xs,
  },
  tab: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: COLORS.surface,
  },
  tabActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'transparent',
  },
  tabText: { fontSize: 13, color: COLORS.textMuted, ...FONT.medium },
  tabTextActive: { color: COLORS.primary },

  errorBox: {
    backgroundColor: COLORS.errorBg,
    borderWidth: 1,
    borderColor: COLORS.error,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  errorText: { color: COLORS.error, fontSize: 13 },

  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
    gap: SPACING.sm,
  },

  // Announcement card
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  cardHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  pinIcon: { marginTop: 3, flexShrink: 0 },
  cardTitle: { flex: 1, fontSize: 15, color: COLORS.text, ...FONT.semibold },
  statusBadge: {
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    flexShrink: 0,
  },
  statusText: { fontSize: 10, ...FONT.semibold, textTransform: 'uppercase', letterSpacing: 0.4 },

  cardContent: { fontSize: 13, color: COLORS.textSecondary, ...FONT.regular, lineHeight: 19 },

  cardMeta: { gap: 2 },
  cardMetaText: { fontSize: 11, color: COLORS.textMuted, ...FONT.regular },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  cardAuthor: { fontSize: 12, color: COLORS.textMuted, ...FONT.regular },
  archiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
  },
  archiveBtnText: { fontSize: 12, color: COLORS.textMuted, ...FONT.medium },

  // Empty
  empty: {
    alignItems: 'center',
    paddingTop: SPACING.xxl,
    gap: SPACING.sm,
  },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, ...FONT.regular, marginTop: 4 },
  emptyAction: { marginTop: SPACING.xs },
  emptyActionText: { fontSize: 14, color: COLORS.primary, ...FONT.medium },

  // Create modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
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
    maxHeight: '90%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  modalTitle: { fontSize: 18, color: COLORS.text, ...FONT.bold, marginBottom: SPACING.md },
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
    height: 88,
    textAlignVertical: 'top',
    paddingTop: 11,
  },
  fieldHint: {
    fontSize: 11,
    color: COLORS.textMuted,
    ...FONT.regular,
    marginTop: 4,
  },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  checkboxActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  toggleLabel: { fontSize: 14, color: COLORS.text, ...FONT.medium },
  toggleSub: { fontSize: 12, color: COLORS.textMuted, ...FONT.regular, marginTop: 2 },

  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 15, color: COLORS.onPrimary, ...FONT.semibold },
  cancelBtn: { alignItems: 'center', paddingVertical: SPACING.md },
  cancelBtnText: { fontSize: 14, color: COLORS.textMuted, ...FONT.regular },
});
