import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import {
  useExercises,
  useLeaderboard,
  useMyPrs,
  useSubmitPr,
  useUploadLeaderboardPhoto,
} from '../../hooks/leaderboard';
import { useEquippedBadgesMap } from '../../hooks/members';
import { EquippedBadgeChip } from '../../components/EquippedBadgeChip';
import type { Exercise, LeaderboardEntry, PrSubmission } from '../../types';
import { FONT, RADIUS, SPACING } from '../../constants/theme';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const MEDAL = ['🥇', '🥈', '🥉'];

// ─── Submit PR Modal ──────────────────────────────────────────────────────────

function SubmitPrModal({
  visible,
  exercises,
  onClose,
  onSubmitted,
}: {
  visible: boolean;
  exercises: Exercise[];
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const { theme } = useTheme();
  const C = theme.colors;
  const uploadPhoto = useUploadLeaderboardPhoto();
  const submitPr = useSubmitPr();
  const [step, setStep] = useState<'form' | 'uploading' | 'submitting'>('form');
  const [exerciseId, setExerciseId] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [reps, setReps] = useState('');
  const [notes, setNotes] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        modalRoot: { flex: 1, backgroundColor: C.background },
        modalHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: SPACING.md,
          paddingTop: Platform.OS === 'ios' ? SPACING.lg : SPACING.md,
          paddingBottom: SPACING.md,
          borderBottomWidth: 1,
          borderBottomColor: C.border,
        },
        modalHeaderBtn: { minWidth: 64, paddingVertical: 4 },
        modalTitle: { fontSize: 17, ...FONT.semibold, color: C.text },
        modalCancel: { fontSize: 16, color: C.textSecondary },
        modalSave: { fontSize: 16, ...FONT.semibold, textAlign: 'right' },
        modalContent: { padding: SPACING.md, gap: SPACING.xs, paddingBottom: SPACING.xxl },

        errorBanner: { backgroundColor: C.errorBg, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm },
        errorBannerText: { color: C.error, fontSize: 13 },

        fieldLabel: { color: C.textSecondary, fontSize: 12, ...FONT.semibold, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: SPACING.xs },
        input: {
          backgroundColor: C.surface,
          borderRadius: RADIUS.sm,
          borderWidth: 1,
          borderColor: C.border,
          paddingHorizontal: SPACING.md,
          paddingVertical: SPACING.sm,
          color: C.text,
          fontSize: 15,
          ...FONT.medium,
        },

        est1rmBadge: {
          borderRadius: RADIUS.md,
          borderWidth: 1,
          paddingVertical: SPACING.sm,
          paddingHorizontal: SPACING.md,
          marginVertical: SPACING.xs,
          alignItems: 'center',
        },
        est1rmText: { fontSize: 16, ...FONT.bold },

        exerciseChip: {
          paddingHorizontal: SPACING.md,
          paddingVertical: 8,
          borderRadius: RADIUS.full,
          backgroundColor: C.surface,
          borderWidth: 1,
          borderColor: C.border,
        },
        exerciseChipText: { fontSize: 13, color: C.textSecondary, ...FONT.medium },

        photoPreviewWrap: { position: 'relative', borderRadius: RADIUS.md, overflow: 'hidden', marginTop: SPACING.xs },
        photoPreview: { width: '100%', height: 200, borderRadius: RADIUS.md },
        photoRemove: { position: 'absolute', top: SPACING.sm, right: SPACING.sm },
        photoBtn: {
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: SPACING.xs,
          borderWidth: 1,
          borderRadius: RADIUS.md,
          paddingVertical: SPACING.md,
          backgroundColor: C.surface,
        },
        photoBtnText: { fontSize: 14, ...FONT.medium },
      }),
    [C],
  );

  useEffect(() => {
    if (visible) {
      setStep('form');
      setExerciseId('');
      setWeightKg('');
      setReps('');
      setNotes('');
      setPhotoUri(null);
      setError(null);
    }
  }, [visible]);

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow camera access.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  async function handleSubmit() {
    if (!exerciseId) { setError('Please select an exercise.'); return; }
    const w = parseFloat(weightKg);
    const r = parseInt(reps, 10);
    if (!weightKg || isNaN(w) || w <= 0) { setError('Enter a valid weight.'); return; }
    if (!reps || isNaN(r) || r < 1 || r > 60) { setError('Enter reps between 1 and 60.'); return; }
    if (!photoUri) { setError('A photo is required.'); return; }

    setError(null);
    setStep('uploading');

    try {
      const { url } = await uploadPhoto.mutateAsync(photoUri);
      setStep('submitting');
      await submitPr.mutateAsync({
        exerciseId,
        weightKg: w,
        reps: r,
        photoUrl: url,
        notes: notes.trim() || undefined,
      });
      onSubmitted();
      onClose();
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err.message ?? 'Submission failed. Please try again.');
      setStep('form');
    }
  }

  const busy = step !== 'form';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={busy ? undefined : onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalRoot}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.modalHeader}>
          <Pressable onPress={busy ? undefined : onClose} style={styles.modalHeaderBtn}>
            <Text style={[styles.modalCancel, busy && { opacity: 0.4 }]}>Cancel</Text>
          </Pressable>
          <Text style={styles.modalTitle}>Submit PR</Text>
          <Pressable onPress={busy ? undefined : handleSubmit} style={[styles.modalHeaderBtn, busy && { opacity: 0.5 }]}>
            <Text style={[styles.modalSave, { color: theme.primary }]}>
              {step === 'uploading' ? 'Uploading…' : step === 'submitting' ? 'Sending…' : 'Submit'}
            </Text>
          </Pressable>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.modalContent}
          keyboardShouldPersistTaps="handled"
        >
          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          )}

          {/* Exercise picker */}
          <Text style={styles.fieldLabel}>Exercise</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.md }}>
            <View style={{ flexDirection: 'row', gap: SPACING.xs, paddingRight: SPACING.md }}>
              {exercises.map((ex) => (
                <Pressable
                  key={ex.id}
                  onPress={() => setExerciseId(ex.id)}
                  style={[
                    styles.exerciseChip,
                    exerciseId === ex.id && { backgroundColor: theme.primary, borderColor: theme.primary },
                  ]}
                >
                  <Text style={[styles.exerciseChipText, exerciseId === ex.id && { color: '#000' }]}>
                    {ex.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {/* Weight + Reps */}
          <View style={{ flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.md }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Weight (kg)</Text>
              <TextInput
                style={styles.input}
                value={weightKg}
                onChangeText={setWeightKg}
                keyboardType="numeric"
                placeholder="e.g. 100"
                placeholderTextColor={C.textMuted}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Reps</Text>
              <TextInput
                style={styles.input}
                value={reps}
                onChangeText={setReps}
                keyboardType="numeric"
                placeholder="e.g. 5"
                placeholderTextColor={C.textMuted}
              />
            </View>
          </View>

          {/* 1RM Preview */}
          {weightKg && reps && !isNaN(parseFloat(weightKg)) && !isNaN(parseInt(reps, 10)) && (
            <View style={[styles.est1rmBadge, { backgroundColor: theme.primary + '15', borderColor: theme.primary + '40' }]}>
              <Text style={[styles.est1rmText, { color: theme.primary }]}>
                Est. 1RM: {(parseFloat(weightKg) * (1 + parseInt(reps, 10) / 30)).toFixed(1)} kg
              </Text>
            </View>
          )}

          {/* Notes */}
          <Text style={[styles.fieldLabel, { marginTop: SPACING.md }]}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, { minHeight: 64, textAlignVertical: 'top' }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Any notes about this lift…"
            placeholderTextColor={C.textMuted}
            multiline
          />

          {/* Photo */}
          <Text style={[styles.fieldLabel, { marginTop: SPACING.md }]}>Photo (required)</Text>
          {photoUri ? (
            <View style={styles.photoPreviewWrap}>
              <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
              <Pressable
                onPress={() => setPhotoUri(null)}
                style={styles.photoRemove}
              >
                <Ionicons name="close-circle" size={24} color={C.error} />
              </Pressable>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
              <Pressable onPress={takePhoto} style={[styles.photoBtn, { borderColor: theme.primary + '60' }]}>
                <Ionicons name="camera-outline" size={22} color={theme.primary} />
                <Text style={[styles.photoBtnText, { color: theme.primary }]}>Camera</Text>
              </Pressable>
              <Pressable onPress={pickPhoto} style={[styles.photoBtn, { borderColor: C.border }]}>
                <Ionicons name="image-outline" size={22} color={C.textSecondary} />
                <Text style={[styles.photoBtnText, { color: C.textSecondary }]}>Gallery</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function LeaderboardScreen() {
  const { theme } = useTheme();
  const C = theme.colors;

  const leaderboardQ = useLeaderboard();
  const exercisesQ = useExercises();
  const myPrsQ = useMyPrs();
  const equippedBadgesQ = useEquippedBadgesMap();

  const leaderboard = leaderboardQ.data ?? [];
  const exercises: Exercise[] = exercisesQ.data ?? [];
  const myPrs: PrSubmission[] = myPrsQ.data ?? [];
  const equippedBadges = equippedBadgesQ.data;
  const loading = leaderboardQ.isLoading || exercisesQ.isLoading || myPrsQ.isLoading;
  const refreshing =
    leaderboardQ.isRefetching || exercisesQ.isRefetching || myPrsQ.isRefetching;

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [tab, setTab] = useState<'board' | 'mine'>('board');
  const [submitVisible, setSubmitVisible] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1, backgroundColor: C.background },
        centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.background },

        header: {
          paddingTop: 60,
          paddingHorizontal: SPACING.md,
          paddingBottom: 0,
        },
        pageTitle: {
          fontSize: 24,
          ...FONT.bold,
          color: C.text,
          marginBottom: SPACING.md,
        },
        tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.border },
        tab: {
          flex: 1,
          paddingBottom: SPACING.sm,
          alignItems: 'center',
          borderBottomWidth: 2,
          borderBottomColor: 'transparent',
        },
        tabText: { fontSize: 14, color: C.textSecondary, ...FONT.medium },

        exercisePicker: { paddingVertical: SPACING.md },
        exerciseTab: {
          paddingHorizontal: SPACING.md,
          paddingVertical: 8,
          borderRadius: RADIUS.full,
          backgroundColor: C.surface,
          borderWidth: 1,
          borderColor: C.border,
        },
        exerciseTabText: { fontSize: 13, color: C.textSecondary, ...FONT.medium },

        card: {
          marginHorizontal: SPACING.md,
          marginBottom: SPACING.md,
          backgroundColor: C.surface,
          borderRadius: RADIUS.lg,
          borderWidth: 1,
          borderColor: C.border,
          padding: SPACING.md,
          gap: SPACING.sm,
        },
        cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xs },
        cardTitle: { fontSize: 16, ...FONT.semibold, color: C.text },
        cardSubTitle: { fontSize: 11, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 },

        rankRow: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: SPACING.sm,
          borderBottomWidth: 1,
          borderBottomColor: C.border + '60',
          gap: SPACING.sm,
        },
        rankMedal: { fontSize: 18, width: 30, textAlign: 'center' },
        rankNameWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
        rankName: { flexShrink: 1, fontSize: 14, color: C.text, ...FONT.medium },
        rankStats: { alignItems: 'flex-end' },
        rankORM: { fontSize: 15, ...FONT.bold },
        rankLifted: { fontSize: 11, color: C.textMuted },

        myPrsSection: { padding: SPACING.md, gap: SPACING.sm },
        prCard: {
          backgroundColor: C.surface,
          borderRadius: RADIUS.lg,
          borderWidth: 1,
          borderColor: C.border,
          padding: SPACING.md,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        },
        prCardLeft: { flex: 1 },
        prExerciseName: { fontSize: 15, ...FONT.semibold, color: C.text, marginBottom: 2 },
        prLifted: { fontSize: 13, color: C.textSecondary },
        prDate: { fontSize: 11, color: C.textMuted, marginTop: 2 },
        prCardRight: { alignItems: 'flex-end', gap: 4 },
        prORM: { fontSize: 18, ...FONT.bold },
        prORMLabel: { fontSize: 10, color: C.textMuted, textTransform: 'uppercase' },
        statusPill: { paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.full },
        statusPillText: { fontSize: 10, ...FONT.semibold },

        emptyCard: {
          margin: SPACING.md,
          backgroundColor: C.surface,
          borderRadius: RADIUS.lg,
          borderWidth: 1,
          borderColor: C.border,
          padding: SPACING.xl,
          alignItems: 'center',
          gap: SPACING.xs,
        },
        emptyText: { fontSize: 14, color: C.textSecondary, ...FONT.medium, textAlign: 'center' },
        emptySubText: { fontSize: 12, color: C.textMuted, textAlign: 'center' },

        fab: {
          position: 'absolute',
          right: SPACING.lg,
          bottom: SPACING.xl,
          width: 56,
          height: 56,
          borderRadius: 28,
          alignItems: 'center',
          justifyContent: 'center',
          elevation: 4,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
        },
      }),
    [C],
  );

  function handleRefresh() {
    leaderboardQ.refetch();
    exercisesQ.refetch();
    myPrsQ.refetch();
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  const current = leaderboard[selectedIdx] ?? null;

  return (
    <View style={styles.root}>
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Leaderboard</Text>
          <View style={styles.tabRow}>
            {(['board', 'mine'] as const).map((t) => (
              <Pressable
                key={t}
                onPress={() => setTab(t)}
                style={[styles.tab, tab === t && { borderBottomColor: theme.primary }]}
              >
                <Text style={[styles.tabText, tab === t && { color: theme.primary, ...FONT.semibold }]}>
                  {t === 'board' ? 'Rankings' : 'My PRs'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {tab === 'board' ? (
          leaderboard.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No leaderboard exercises enabled yet.</Text>
              <Text style={styles.emptySubText}>Ask your gym staff to configure the leaderboard.</Text>
            </View>
          ) : (
            <>
              {/* Exercise selector */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.exercisePicker}
                contentContainerStyle={{ gap: SPACING.xs, paddingHorizontal: SPACING.md }}
              >
                {leaderboard.map((item, idx) => (
                  <Pressable
                    key={item.exercise.id}
                    onPress={() => setSelectedIdx(idx)}
                    style={[
                      styles.exerciseTab,
                      idx === selectedIdx && { backgroundColor: theme.primary, borderColor: theme.primary },
                    ]}
                  >
                    <Text style={[styles.exerciseTabText, idx === selectedIdx && { color: '#000' }]}>
                      {item.exercise.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              {/* Rankings */}
              {current && (
                <View style={styles.card}>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.cardTitle}>{current.exercise.name}</Text>
                    <Text style={styles.cardSubTitle}>{current.exercise.category}</Text>
                  </View>
                  {current.entries.length === 0 ? (
                    <Text style={styles.emptyText}>No approved PRs yet. Be the first!</Text>
                  ) : (
                    current.entries.map((entry: LeaderboardEntry) => {
                      const badge = equippedBadges?.get(entry.member.user.id);
                      return (
                        <View key={entry.id} style={styles.rankRow}>
                          <Text style={styles.rankMedal}>
                            {entry.rank <= 3 ? MEDAL[entry.rank - 1] : `#${entry.rank}`}
                          </Text>
                          <View style={styles.rankNameWrap}>
                            <Text style={styles.rankName} numberOfLines={1}>
                              {entry.member.user.fullName}
                            </Text>
                            {badge && <EquippedBadgeChip badge={badge} />}
                          </View>
                          <View style={styles.rankStats}>
                            <Text style={[styles.rankORM, { color: theme.primary }]}>
                              {Number(entry.estimated1rm).toFixed(1)} kg
                            </Text>
                            <Text style={styles.rankLifted}>
                              {Number(entry.weightKg)} × {entry.reps}
                            </Text>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              )}
            </>
          )
        ) : (
          /* My PRs tab */
          <View style={styles.myPrsSection}>
            {myPrs.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No submissions yet.</Text>
                <Text style={styles.emptySubText}>Tap the + button to submit your first PR!</Text>
              </View>
            ) : (
              myPrs.map((pr) => (
                <View key={pr.id} style={styles.prCard}>
                  <View style={styles.prCardLeft}>
                    <Text style={styles.prExerciseName}>{pr.exercise.name}</Text>
                    <Text style={styles.prLifted}>
                      {Number(pr.weightKg)} kg × {pr.reps} reps
                    </Text>
                    <Text style={styles.prDate}>{fmtDate(pr.submittedAt)}</Text>
                  </View>
                  <View style={styles.prCardRight}>
                    <Text style={[styles.prORM, { color: theme.primary }]}>
                      {Number(pr.estimated1rm).toFixed(1)} kg
                    </Text>
                    <Text style={styles.prORMLabel}>Est. 1RM</Text>
                    <StatusPill status={pr.status} styles={styles} />
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Submit PR FAB */}
      <Pressable
        onPress={() => setSubmitVisible(true)}
        style={[styles.fab, { backgroundColor: theme.primary }]}
      >
        <Ionicons name="add" size={28} color="#000" />
      </Pressable>

      <SubmitPrModal
        visible={submitVisible}
        exercises={exercises}
        onClose={() => setSubmitVisible(false)}
        onSubmitted={() => {
          handleRefresh();
          setTab('mine');
        }}
      />
    </View>
  );
}

type LeaderboardStyles = ReturnType<typeof StyleSheet.create<Record<string, object>>>;

function StatusPill({ status, styles }: { status: PrSubmission['status']; styles: LeaderboardStyles }) {
  const { theme } = useTheme();
  const C = theme.colors;
  const map = {
    PENDING:  { label: 'Pending',  bg: C.warningBg,  color: C.warning },
    APPROVED: { label: 'Approved', bg: C.successBg,  color: C.success },
    REJECTED: { label: 'Rejected', bg: C.errorBg,    color: C.error },
  };
  const s = map[status];
  return (
    <View style={[styles.statusPill, { backgroundColor: s.bg }]}>
      <Text style={[styles.statusPillText, { color: s.color }]}>{s.label}</Text>
    </View>
  );
}
