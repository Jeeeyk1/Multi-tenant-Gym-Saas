import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { memberService } from '../../services/member.service';
import type { GymMember, MemberProfile } from '../../types';
import {
  ActivityLevel,
  DietType,
  ExperienceLevel,
  FitnessGoal,
  PreferredStyle,
} from '../../constants/enums';
import { COLORS, FONT, RADIUS, SPACING } from '../../constants/theme';

// ─── Display label maps ───────────────────────────────────────────────────────

const GOAL_LABELS: Record<FitnessGoal, string> = {
  [FitnessGoal.LOSE_WEIGHT]: 'Lose Weight',
  [FitnessGoal.BUILD_MUSCLE]: 'Build Muscle',
  [FitnessGoal.GET_FIT]: 'Get Fit',
  [FitnessGoal.STAY_HEALTHY]: 'Stay Healthy',
  [FitnessGoal.OTHER]: 'Other',
};

const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  [ActivityLevel.BEGINNER]: 'Beginner',
  [ActivityLevel.OCCASIONALLY_ACTIVE]: 'Occasionally Active',
  [ActivityLevel.PRETTY_ACTIVE]: 'Pretty Active',
  [ActivityLevel.VERY_ACTIVE]: 'Very Active',
};

const EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
  [ExperienceLevel.BEGINNER]: 'Beginner',
  [ExperienceLevel.INTERMEDIATE]: 'Intermediate',
  [ExperienceLevel.ADVANCED]: 'Advanced',
};

const STYLE_LABELS: Record<PreferredStyle, string> = {
  [PreferredStyle.WEIGHTS]: 'Weights',
  [PreferredStyle.CARDIO]: 'Cardio',
  [PreferredStyle.MIXED]: 'Mixed',
  [PreferredStyle.HIIT]: 'HIIT',
};

const DIET_LABELS: Record<DietType, string> = {
  [DietType.NONE]: 'None',
  [DietType.VEGETARIAN]: 'Vegetarian',
  [DietType.VEGAN]: 'Vegan',
  [DietType.HALAL]: 'Halal',
  [DietType.GLUTEN_FREE]: 'Gluten Free',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function fmtEnum(value: string | null | undefined, labels: Record<string, string>): string {
  if (!value) return '—';
  return labels[value] ?? value;
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function StatusBadge({ status }: { status: GymMember['status'] }) {
  const map = {
    ACTIVE: { label: 'Active', color: COLORS.success, bg: COLORS.successBg },
    EXPIRED: { label: 'Expired', color: COLORS.error, bg: COLORS.errorBg },
    SUSPENDED: { label: 'Suspended', color: COLORS.warning, bg: COLORS.warningBg },
  };
  const s = map[status];
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function FormSectionTitle({ title }: { title: string }) {
  return <Text style={styles.formSection}>{title}</Text>;
}

function NumericInput({
  label,
  unit,
  value,
  onChange,
}: {
  label: string;
  unit?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.formRow}>
      <Text style={styles.formLabel}>{label}</Text>
      <View style={styles.numericWrap}>
        <TextInput
          style={styles.numericInput}
          value={value}
          onChangeText={onChange}
          keyboardType="numeric"
          placeholder="—"
          placeholderTextColor={COLORS.textMuted}
        />
        {unit && <Text style={styles.unitText}>{unit}</Text>}
      </View>
    </View>
  );
}

function ChipPicker<T extends string>({
  options,
  labels,
  value,
  onChange,
}: {
  options: readonly T[];
  labels: Record<string, string>;
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginTop: SPACING.xs }}
    >
      <View style={{ flexDirection: 'row', gap: SPACING.xs, paddingRight: SPACING.md }}>
        {options.map((opt) => (
          <Pressable
            key={opt}
            style={[styles.chip, value === opt && styles.chipSelected]}
            onPress={() => onChange(opt)}
          >
            <Text style={[styles.chipText, value === opt && styles.chipTextSelected]}>
              {labels[opt]}
            </Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

function DaysPicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: SPACING.xs, marginTop: SPACING.xs }}>
      {[1, 2, 3, 4, 5, 6, 7].map((d) => (
        <Pressable
          key={d}
          style={[styles.chip, value === d && styles.chipSelected, styles.dayChip]}
          onPress={() => onChange(d)}
        >
          <Text style={[styles.chipText, value === d && styles.chipTextSelected]}>{d}</Text>
        </Pressable>
      ))}
    </View>
  );
}

// ─── Edit modal ───────────────────────────────────────────────────────────────

interface ProfileForm {
  age: string;
  weightKg: string;
  targetWeightKg: string;
  heightCm: string;
  daysPerWeek: number | null;
  fitnessGoal: FitnessGoal | null;
  activityLevel: ActivityLevel | null;
  experienceLevel: ExperienceLevel | null;
  preferredStyle: PreferredStyle | null;
  dietType: DietType | null;
  injuries: string;
}

function profileToForm(p: MemberProfile | null): ProfileForm {
  return {
    age: p?.age != null ? String(p.age) : '',
    weightKg: p?.weightKg != null ? String(p.weightKg) : '',
    targetWeightKg: p?.targetWeightKg != null ? String(p.targetWeightKg) : '',
    heightCm: p?.heightCm != null ? String(p.heightCm) : '',
    daysPerWeek: p?.daysPerWeek ?? null,
    fitnessGoal: (p?.fitnessGoal as FitnessGoal) ?? null,
    activityLevel: (p?.activityLevel as ActivityLevel) ?? null,
    experienceLevel: (p?.experienceLevel as ExperienceLevel) ?? null,
    preferredStyle: (p?.preferredStyle as PreferredStyle) ?? null,
    dietType: (p?.dietType as DietType) ?? null,
    injuries: p?.injuries ?? '',
  };
}

function EditProfileModal({
  visible,
  initialForm,
  gymId,
  onClose,
  onSaved,
}: {
  visible: boolean;
  initialForm: ProfileForm;
  gymId: string;
  onClose: () => void;
  onSaved: (profile: MemberProfile) => void;
}) {
  const [form, setForm] = useState<ProfileForm>(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setForm(initialForm);
      setError(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function set<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const data: Partial<Omit<MemberProfile, 'id' | 'memberId'>> = {
        ...(form.age !== '' && { age: parseInt(form.age, 10) }),
        ...(form.weightKg !== '' && { weightKg: parseFloat(form.weightKg) }),
        ...(form.targetWeightKg !== '' && { targetWeightKg: parseFloat(form.targetWeightKg) }),
        ...(form.heightCm !== '' && { heightCm: parseInt(form.heightCm, 10) }),
        ...(form.daysPerWeek != null && { daysPerWeek: form.daysPerWeek }),
        ...(form.fitnessGoal != null && { fitnessGoal: form.fitnessGoal }),
        ...(form.activityLevel != null && { activityLevel: form.activityLevel }),
        ...(form.experienceLevel != null && { experienceLevel: form.experienceLevel }),
        ...(form.preferredStyle != null && { preferredStyle: form.preferredStyle }),
        ...(form.dietType != null && { dietType: form.dietType }),
        ...(form.injuries !== '' && { injuries: form.injuries }),
      };
      const updated = await memberService.updateMyProfile(gymId, data);
      onSaved(updated);
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalRoot}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalHeader}>
          <Pressable onPress={onClose} style={styles.modalHeaderBtn}>
            <Text style={styles.modalCancel}>Cancel</Text>
          </Pressable>
          <Text style={styles.modalTitle}>Edit Profile</Text>
          <Pressable
            onPress={saving ? undefined : handleSave}
            style={[styles.modalHeaderBtn, saving && { opacity: 0.5 }]}
          >
            <Text style={styles.modalSave}>{saving ? 'Saving…' : 'Save'}</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.modalScroll}
          contentContainerStyle={styles.modalContent}
          keyboardShouldPersistTaps="handled"
        >
          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          )}

          <FormSectionTitle title="Body Metrics" />
          <View style={styles.formCard}>
            <NumericInput
              label="Age"
              unit="yrs"
              value={form.age}
              onChange={(v) => set('age', v)}
            />
            <View style={styles.divider} />
            <NumericInput
              label="Weight"
              unit="kg"
              value={form.weightKg}
              onChange={(v) => set('weightKg', v)}
            />
            <View style={styles.divider} />
            <NumericInput
              label="Target Weight"
              unit="kg"
              value={form.targetWeightKg}
              onChange={(v) => set('targetWeightKg', v)}
            />
            <View style={styles.divider} />
            <NumericInput
              label="Height"
              unit="cm"
              value={form.heightCm}
              onChange={(v) => set('heightCm', v)}
            />
          </View>

          <FormSectionTitle title="Training" />
          <View style={styles.formCard}>
            <Text style={styles.formLabel}>Fitness Goal</Text>
            <ChipPicker
              options={Object.values(FitnessGoal)}
              labels={GOAL_LABELS}
              value={form.fitnessGoal}
              onChange={(v) => set('fitnessGoal', v)}
            />
            <View style={styles.divider} />
            <Text style={styles.formLabel}>Activity Level</Text>
            <ChipPicker
              options={Object.values(ActivityLevel)}
              labels={ACTIVITY_LABELS}
              value={form.activityLevel}
              onChange={(v) => set('activityLevel', v)}
            />
            <View style={styles.divider} />
            <Text style={styles.formLabel}>Experience Level</Text>
            <ChipPicker
              options={Object.values(ExperienceLevel)}
              labels={EXPERIENCE_LABELS}
              value={form.experienceLevel}
              onChange={(v) => set('experienceLevel', v)}
            />
            <View style={styles.divider} />
            <Text style={styles.formLabel}>Preferred Style</Text>
            <ChipPicker
              options={Object.values(PreferredStyle)}
              labels={STYLE_LABELS}
              value={form.preferredStyle}
              onChange={(v) => set('preferredStyle', v)}
            />
            <View style={styles.divider} />
            <Text style={styles.formLabel}>Days per Week</Text>
            <DaysPicker
              value={form.daysPerWeek}
              onChange={(v) => set('daysPerWeek', v)}
            />
          </View>

          <FormSectionTitle title="Nutrition" />
          <View style={styles.formCard}>
            <Text style={styles.formLabel}>Diet Type</Text>
            <ChipPicker
              options={Object.values(DietType)}
              labels={DIET_LABELS}
              value={form.dietType}
              onChange={(v) => set('dietType', v)}
            />
          </View>

          <FormSectionTitle title="Health Notes" />
          <View style={styles.formCard}>
            <Text style={styles.formLabel}>Injuries / Limitations</Text>
            <TextInput
              style={styles.textArea}
              value={form.injuries}
              onChangeText={(v) => set('injuries', v)}
              placeholder="Any injuries or physical limitations…"
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={3}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { theme } = useTheme();
  const [member, setMember] = useState<GymMember | null>(null);
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [editVisible, setEditVisible] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      memberService.getMyMember(user.gymId),
      memberService.getMyProfile(user.gymId).catch(() => null),
    ])
      .then(([m, p]) => {
        setMember(m);
        setProfile(p);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  if (!member) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Could not load profile</Text>
      </View>
    );
  }

  const expiryDate = new Date(member.expiryDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const hasProfileData =
    profile &&
    (profile.age != null ||
      profile.weightKg != null ||
      profile.fitnessGoal != null);

  return (
    <>
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        {/* Avatar */}
        <View style={styles.avatarWrap}>
          <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
            <Text style={styles.avatarInitials}>{getInitials(member.user.fullName)}</Text>
          </View>
          <Text style={styles.fullName}>{member.user.fullName}</Text>
          <Text style={styles.email}>{member.user.email}</Text>
          <StatusBadge status={member.status} />
        </View>

        {/* Membership info */}
        <View style={styles.card}>
          <Row label="Membership #" value={member.membershipNumber} />
          <Row label="Plan" value={member.plan?.name ?? '—'} />
          <Row label="Expires" value={expiryDate} />
        </View>

        {/* Fitness Profile */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionTitle}>Fitness Profile</Text>
            <Pressable onPress={() => setEditVisible(true)} style={styles.editBtn}>
              <Text style={[styles.editBtnText, { color: theme.primary }]}>Edit</Text>
            </Pressable>
          </View>
          {hasProfileData ? (
            <>
              {profile!.fitnessGoal && (
                <Row label="Goal" value={fmtEnum(profile!.fitnessGoal, GOAL_LABELS)} />
              )}
              {profile!.activityLevel && (
                <Row label="Activity" value={fmtEnum(profile!.activityLevel, ACTIVITY_LABELS)} />
              )}
              {profile!.experienceLevel && (
                <Row label="Experience" value={fmtEnum(profile!.experienceLevel, EXPERIENCE_LABELS)} />
              )}
              {profile!.preferredStyle && (
                <Row label="Style" value={fmtEnum(profile!.preferredStyle, STYLE_LABELS)} />
              )}
              {profile!.dietType && profile!.dietType !== DietType.NONE && (
                <Row label="Diet" value={fmtEnum(profile!.dietType, DIET_LABELS)} />
              )}
              {profile!.daysPerWeek != null && (
                <Row
                  label="Days / week"
                  value={`${profile!.daysPerWeek} day${profile!.daysPerWeek !== 1 ? 's' : ''}`}
                />
              )}
              {profile!.age != null && (
                <Row label="Age" value={`${profile!.age} yrs`} />
              )}
              {profile!.weightKg != null && (
                <Row label="Weight" value={`${profile!.weightKg} kg`} />
              )}
              {profile!.targetWeightKg != null && (
                <Row label="Target" value={`${profile!.targetWeightKg} kg`} />
              )}
              {profile!.heightCm != null && (
                <Row label="Height" value={`${profile!.heightCm} cm`} />
              )}
              {profile!.injuries && (
                <Row label="Injuries" value={profile!.injuries} />
              )}
            </>
          ) : (
            <Text style={styles.emptyProfileText}>
              Tap Edit to complete your fitness profile
            </Text>
          )}
        </View>

        {/* QR Code */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Check-in QR</Text>
          <Text style={styles.qrHint}>Show this at the gym to check in</Text>
          <View style={styles.qrWrap}>
            <QRCode
              value={member.qrCodeToken}
              size={200}
              backgroundColor="#ffffff"
              color="#000000"
            />
          </View>
          <Text style={styles.qrToken}>{member.qrCodeToken.slice(0, 8).toUpperCase()}…</Text>
        </View>

        {/* Sign out */}
        <Pressable
          style={[styles.signOutBtn, signingOut && { opacity: 0.6 }]}
          onPress={signingOut ? undefined : handleSignOut}
        >
          <Text style={styles.signOutText}>
            {signingOut ? 'Signing out…' : 'Sign Out'}
          </Text>
        </Pressable>
      </ScrollView>

      {user && (
        <EditProfileModal
          visible={editVisible}
          initialForm={profileToForm(profile)}
          gymId={user.gymId}
          onClose={() => setEditVisible(false)}
          onSaved={(updated) => {
            setProfile(updated);
            setEditVisible(false);
          }}
        />
      )}
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingTop: 60,
    paddingBottom: SPACING.xxl,
    paddingHorizontal: SPACING.md,
    gap: SPACING.md,
  },
  centered: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: COLORS.textSecondary,
    fontSize: 16,
  },
  avatarWrap: {
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  avatarInitials: {
    color: '#000',
    fontSize: 28,
    ...FONT.bold,
  },
  fullName: {
    color: COLORS.text,
    fontSize: 22,
    ...FONT.bold,
  },
  email: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  badgeText: {
    fontSize: 12,
    ...FONT.semibold,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 16,
    ...FONT.semibold,
  },
  editBtn: {
    paddingVertical: 4,
    paddingHorizontal: SPACING.sm,
  },
  editBtnText: {
    fontSize: 14,
    ...FONT.medium,
  },
  emptyProfileText: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: SPACING.sm,
  },
  qrHint: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  qrWrap: {
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: '#ffffff',
    borderRadius: RADIUS.md,
  },
  qrToken: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  rowLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  rowValue: {
    color: COLORS.text,
    fontSize: 14,
    ...FONT.medium,
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: SPACING.sm,
  },
  signOutBtn: {
    backgroundColor: COLORS.errorBg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.error,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  signOutText: {
    color: COLORS.error,
    fontSize: 16,
    ...FONT.semibold,
  },

  // ── Modal ────────────────────────────────────────────────────────────────────
  modalRoot: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: Platform.OS === 'ios' ? SPACING.lg : SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalHeaderBtn: {
    minWidth: 60,
    paddingVertical: 4,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 17,
    ...FONT.semibold,
  },
  modalCancel: {
    color: COLORS.textSecondary,
    fontSize: 16,
  },
  modalSave: {
    color: COLORS.primary,
    fontSize: 16,
    ...FONT.semibold,
    textAlign: 'right',
  },
  modalScroll: {
    flex: 1,
  },
  modalContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xxl,
    gap: SPACING.xs,
  },
  errorBanner: {
    backgroundColor: COLORS.errorBg,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.md,
  },
  errorBannerText: {
    color: COLORS.error,
    fontSize: 14,
  },

  // ── Form ─────────────────────────────────────────────────────────────────────
  formSection: {
    color: COLORS.textSecondary,
    fontSize: 12,
    ...FONT.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: SPACING.lg,
    marginBottom: SPACING.xs,
    paddingHorizontal: 2,
  },
  formCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  formLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
    ...FONT.medium,
    marginBottom: 2,
  },
  numericWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  numericInput: {
    color: COLORS.text,
    fontSize: 16,
    ...FONT.medium,
    textAlign: 'right',
    minWidth: 60,
    paddingVertical: 4,
    paddingHorizontal: SPACING.sm,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  unitText: {
    color: COLORS.textMuted,
    fontSize: 13,
    minWidth: 24,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 2,
  },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    ...FONT.medium,
  },
  chipTextSelected: {
    color: COLORS.onPrimary,
  },
  dayChip: {
    minWidth: 36,
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
  },
  textArea: {
    color: COLORS.text,
    fontSize: 14,
    ...FONT.regular,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.sm,
    minHeight: 72,
    textAlignVertical: 'top',
    marginTop: SPACING.xs,
  },
});
