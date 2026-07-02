import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  useEquipBadge,
  useMyBadges,
  useMyMember,
  useMyProfile,
  useUpdateMyProfile,
} from '../../hooks/members';
import type { EquippedBadgeDisplay, GymMember, MemberBadge, MemberProfile } from '../../types';
import { EquippedBadgeChip } from '../../components/EquippedBadgeChip';
import {
  ActivityLevel,
  DietType,
  ExperienceLevel,
  FitnessGoal,
  PreferredStyle,
} from '../../constants/enums';
import { FONT, RADIUS, SPACING } from '../../constants/theme';
import type { ColorPalette } from '../../constants/theme';

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
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

function fmtEnum(value: string | null | undefined, labels: Record<string, string>): string {
  if (!value) return '—';
  return labels[value] ?? value;
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function StatusBadge({ status }: { status: GymMember['status'] }) {
  const { theme } = useTheme();
  const C = theme.colors;
  const map = {
    ACTIVE:    { label: 'Active',    color: C.success,  bg: C.successBg },
    EXPIRED:   { label: 'Expired',   color: C.error,    bg: C.errorBg },
    SUSPENDED: { label: 'Suspended', color: C.warning,  bg: C.warningBg },
  };
  const s = map[status];
  return (
    <View style={{ backgroundColor: s.bg, paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.full }}>
      <Text style={{ color: s.color, fontSize: 12, ...FONT.semibold }}>{s.label}</Text>
    </View>
  );
}

function Row({ label, value, C }: { label: string; value: string; C: ColorPalette }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 }}>
      <Text style={{ color: C.textSecondary, fontSize: 14 }}>{label}</Text>
      <Text style={{ color: C.text, fontSize: 14, ...FONT.medium, flexShrink: 1, textAlign: 'right', marginLeft: SPACING.sm }}>
        {value}
      </Text>
    </View>
  );
}

function NavRow({ icon, label, onPress, C }: { icon: string; label: string; onPress: () => void; C: ColorPalette }) {
  return (
    <Pressable
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: C.surface,
          borderRadius: RADIUS.md,
          borderWidth: 1,
          borderColor: C.border,
          paddingHorizontal: SPACING.md,
          paddingVertical: 15,
        },
        pressed && { opacity: 0.75 },
      ]}
      onPress={onPress}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
        <Ionicons name={icon as never} size={18} color={C.textSecondary} />
        <Text style={{ fontSize: 15, color: C.text, ...FONT.medium }}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
    </Pressable>
  );
}

// ─── Badge helpers ────────────────────────────────────────────────────────────

const BADGE_SOURCE_LABELS: Record<string, string> = {
  AUTO_SYSTEM: 'Consistency',
  AUTO_CYCLE: 'Leaderboard',
  AUTO_MILESTONE: 'Milestone',
  STAFF_AWARD: 'Staff Award',
};

function badgeName(b: MemberBadge): string {
  return b.badgeCatalog?.name ?? b.customBadge?.name ?? b.milestoneBadge?.badgeName ?? 'Badge';
}
function badgeColor(b: MemberBadge): string {
  return b.badgeCatalog?.color ?? b.customBadge?.color ?? b.milestoneBadge?.color ?? '#6B7280';
}
function badgeRankIcon(rank: MemberBadge['badgeRank']): string {
  if (rank === 'GOLD') return '🥇';
  if (rank === 'SILVER') return '🥈';
  if (rank === 'BRONZE') return '🥉';
  return '◆';
}
function toEquippedDisplay(b: MemberBadge): EquippedBadgeDisplay {
  return {
    name: badgeName(b),
    color: badgeColor(b),
    icon: b.badgeCatalog?.icon ?? b.customBadge?.icon ?? b.milestoneBadge?.icon ?? 'ribbon',
    rank: b.badgeRank,
  };
}

function BadgeItem({ badge }: { badge: MemberBadge }) {
  const { theme } = useTheme();
  const C = theme.colors;
  const color = badgeColor(badge);
  const isExpired = badge.expiresAt ? new Date(badge.expiresAt) < new Date() : false;
  const equipMutation = useEquipBadge();

  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: 6 }, isExpired && { opacity: 0.5 }]}>
      <View style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: color + '33', borderColor: color }}>
        <Text style={{ fontSize: 13 }}>{badgeRankIcon(badge.badgeRank)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.text, fontSize: 14, ...FONT.medium }}>{badgeName(badge)}</Text>
        <Text style={{ color: C.textMuted, fontSize: 12, marginTop: 1 }}>
          {BADGE_SOURCE_LABELS[badge.source] ?? badge.source}{isExpired ? ' · Expired' : ''}
        </Text>
      </View>
      <Pressable
        onPress={() => {
          if (!isExpired && !equipMutation.isPending)
            equipMutation.mutate({ badgeId: badge.id, equipped: !badge.isEquipped });
        }}
        disabled={isExpired || equipMutation.isPending}
        style={({ pressed }) => [{ padding: 4, flexShrink: 0 }, pressed && { opacity: 0.6 }]}
        hitSlop={8}
      >
        <Ionicons
          name={badge.isEquipped ? 'star' : 'star-outline'}
          size={20}
          color={badge.isEquipped ? '#F59E0B' : C.textMuted}
        />
      </Pressable>
    </View>
  );
}

// ─── Form sub-components ──────────────────────────────────────────────────────

function NumericInput({ label, unit, value, onChange, C }: {
  label: string; unit?: string; value: string; onChange: (v: string) => void; C: ColorPalette;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text style={{ color: C.textSecondary, fontSize: 14, ...FONT.medium, marginBottom: 2 }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.xs }}>
        <TextInput
          style={{
            color: C.text, fontSize: 16, ...FONT.medium, textAlign: 'right',
            minWidth: 60, paddingVertical: 4, paddingHorizontal: SPACING.sm,
            backgroundColor: C.background, borderRadius: RADIUS.sm,
            borderWidth: 1, borderColor: C.border,
          }}
          value={value}
          onChangeText={onChange}
          keyboardType="numeric"
          placeholder="—"
          placeholderTextColor={C.textMuted}
        />
        {unit && <Text style={{ color: C.textMuted, fontSize: 13, minWidth: 24 }}>{unit}</Text>}
      </View>
    </View>
  );
}

function ChipPicker<T extends string>({ options, labels, value, onChange, C, primary }: {
  options: readonly T[]; labels: Record<string, string>; value: T | null; onChange: (v: T) => void;
  C: ColorPalette; primary: string;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: SPACING.xs }}>
      <View style={{ flexDirection: 'row', gap: SPACING.xs, paddingRight: SPACING.md }}>
        {options.map((opt) => (
          <Pressable
            key={opt}
            style={{
              paddingHorizontal: SPACING.md, paddingVertical: 8, borderRadius: RADIUS.full,
              backgroundColor: value === opt ? primary : C.background,
              borderWidth: 1, borderColor: value === opt ? primary : C.border,
            }}
            onPress={() => onChange(opt)}
          >
            <Text style={{ color: value === opt ? '#fff' : C.textSecondary, fontSize: 13, ...FONT.medium }}>
              {labels[opt]}
            </Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

function DaysPicker({ value, onChange, C, primary }: {
  value: number | null; onChange: (v: number) => void; C: ColorPalette; primary: string;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: SPACING.xs, marginTop: SPACING.xs }}>
      {[1, 2, 3, 4, 5, 6, 7].map((d) => (
        <Pressable
          key={d}
          style={{
            paddingHorizontal: SPACING.sm, paddingVertical: 8, borderRadius: RADIUS.full,
            minWidth: 36, alignItems: 'center',
            backgroundColor: value === d ? primary : C.background,
            borderWidth: 1, borderColor: value === d ? primary : C.border,
          }}
          onPress={() => onChange(d)}
        >
          <Text style={{ color: value === d ? '#fff' : C.textSecondary, fontSize: 13, ...FONT.medium }}>{d}</Text>
        </Pressable>
      ))}
    </View>
  );
}

// ─── Edit modal ───────────────────────────────────────────────────────────────

interface ProfileForm {
  age: string; weightKg: string; targetWeightKg: string; heightCm: string;
  daysPerWeek: number | null; fitnessGoal: FitnessGoal | null;
  activityLevel: ActivityLevel | null; experienceLevel: ExperienceLevel | null;
  preferredStyle: PreferredStyle | null; dietType: DietType | null; injuries: string;
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

function EditProfileModal({ visible, initialForm, onClose }: {
  visible: boolean; initialForm: ProfileForm; onClose: () => void;
}) {
  const { theme } = useTheme();
  const C = theme.colors;
  const [form, setForm] = useState<ProfileForm>(initialForm);
  const [error, setError] = useState<string | null>(null);
  const updateProfile = useUpdateMyProfile();
  const saving = updateProfile.isPending;

  useEffect(() => {
    if (visible) { setForm(initialForm); setError(null); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function set<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    setError(null);
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
    updateProfile.mutate(data, {
      onSuccess: () => onClose(),
      onError: () => setError('Failed to save. Please try again.'),
    });
  }

  const s = useMemo(() => StyleSheet.create({
    root: { flex: 1, backgroundColor: C.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: SPACING.md,
      paddingTop: Platform.OS === 'ios' ? SPACING.lg : SPACING.md,
      paddingBottom: SPACING.md,
      borderBottomWidth: 1, borderBottomColor: C.border,
    },
    headerBtn: { minWidth: 60, paddingVertical: 4 },
    title: { color: C.text, fontSize: 17, ...FONT.semibold },
    cancel: { color: C.textSecondary, fontSize: 16 },
    divider: { height: 1, backgroundColor: C.border, marginVertical: 2 },
    formCard: {
      backgroundColor: C.surface, borderRadius: RADIUS.lg,
      borderWidth: 1, borderColor: C.border, padding: SPACING.md, gap: SPACING.sm,
    },
    formSection: {
      color: C.textSecondary, fontSize: 12, ...FONT.semibold,
      textTransform: 'uppercase', letterSpacing: 0.8,
      marginTop: SPACING.lg, marginBottom: SPACING.xs, paddingHorizontal: 2,
    },
    formLabel: { color: C.textSecondary, fontSize: 14, ...FONT.medium, marginBottom: 2 },
    textArea: {
      color: C.text, fontSize: 14, ...FONT.regular,
      backgroundColor: C.background, borderRadius: RADIUS.sm,
      borderWidth: 1, borderColor: C.border,
      padding: SPACING.sm, minHeight: 72, textAlignVertical: 'top', marginTop: SPACING.xs,
    },
    errorBanner: { backgroundColor: C.errorBg, borderRadius: RADIUS.md, padding: SPACING.md, marginTop: SPACING.md },
    errorText: { color: C.error, fontSize: 14 },
  }), [C]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.header}>
          <Pressable onPress={onClose} style={s.headerBtn}>
            <Text style={s.cancel}>Cancel</Text>
          </Pressable>
          <Text style={s.title}>Edit Profile</Text>
          <Pressable onPress={saving ? undefined : handleSave} style={[s.headerBtn, saving && { opacity: 0.5 }]}>
            <Text style={{ color: theme.primary, fontSize: 16, ...FONT.semibold, textAlign: 'right' }}>
              {saving ? 'Saving…' : 'Save'}
            </Text>
          </Pressable>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: SPACING.md, paddingBottom: SPACING.xxl, gap: SPACING.xs }} keyboardShouldPersistTaps="handled">
          {error && <View style={s.errorBanner}><Text style={s.errorText}>{error}</Text></View>}

          <Text style={s.formSection}>Body Metrics</Text>
          <View style={s.formCard}>
            <NumericInput label="Age" unit="yrs" value={form.age} onChange={(v) => set('age', v)} C={C} />
            <View style={s.divider} />
            <NumericInput label="Weight" unit="kg" value={form.weightKg} onChange={(v) => set('weightKg', v)} C={C} />
            <View style={s.divider} />
            <NumericInput label="Target Weight" unit="kg" value={form.targetWeightKg} onChange={(v) => set('targetWeightKg', v)} C={C} />
            <View style={s.divider} />
            <NumericInput label="Height" unit="cm" value={form.heightCm} onChange={(v) => set('heightCm', v)} C={C} />
          </View>

          <Text style={s.formSection}>Training</Text>
          <View style={s.formCard}>
            <Text style={s.formLabel}>Fitness Goal</Text>
            <ChipPicker options={Object.values(FitnessGoal)} labels={GOAL_LABELS} value={form.fitnessGoal} onChange={(v) => set('fitnessGoal', v)} C={C} primary={theme.primary} />
            <View style={s.divider} />
            <Text style={s.formLabel}>Activity Level</Text>
            <ChipPicker options={Object.values(ActivityLevel)} labels={ACTIVITY_LABELS} value={form.activityLevel} onChange={(v) => set('activityLevel', v)} C={C} primary={theme.primary} />
            <View style={s.divider} />
            <Text style={s.formLabel}>Experience Level</Text>
            <ChipPicker options={Object.values(ExperienceLevel)} labels={EXPERIENCE_LABELS} value={form.experienceLevel} onChange={(v) => set('experienceLevel', v)} C={C} primary={theme.primary} />
            <View style={s.divider} />
            <Text style={s.formLabel}>Preferred Style</Text>
            <ChipPicker options={Object.values(PreferredStyle)} labels={STYLE_LABELS} value={form.preferredStyle} onChange={(v) => set('preferredStyle', v)} C={C} primary={theme.primary} />
            <View style={s.divider} />
            <Text style={s.formLabel}>Days per Week</Text>
            <DaysPicker value={form.daysPerWeek} onChange={(v) => set('daysPerWeek', v)} C={C} primary={theme.primary} />
          </View>

          <Text style={s.formSection}>Nutrition</Text>
          <View style={s.formCard}>
            <Text style={s.formLabel}>Diet Type</Text>
            <ChipPicker options={Object.values(DietType)} labels={DIET_LABELS} value={form.dietType} onChange={(v) => set('dietType', v)} C={C} primary={theme.primary} />
          </View>

          <Text style={s.formSection}>Health Notes</Text>
          <View style={s.formCard}>
            <Text style={s.formLabel}>Injuries / Limitations</Text>
            <TextInput
              style={s.textArea}
              value={form.injuries}
              onChangeText={(v) => set('injuries', v)}
              placeholder="Any injuries or physical limitations…"
              placeholderTextColor={C.textMuted}
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
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { theme, toggleColorScheme } = useTheme();
  const C = theme.colors;

  const memberQ = useMyMember();
  const profileQ = useMyProfile();
  const badgesQ = useMyBadges();
  const [signingOut, setSigningOut] = useState(false);
  const [editVisible, setEditVisible] = useState(false);

  const member: GymMember | null = memberQ.data ?? null;
  const profile: MemberProfile | null = profileQ.data ?? null;
  const badges: MemberBadge[] = badgesQ.data ?? [];
  const equippedBadge = badges.find((b) => b.isEquipped) ?? null;
  const loading = memberQ.isLoading || profileQ.isLoading || badgesQ.isLoading;

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
  }

  const s = useMemo(() => StyleSheet.create({
    root: { flex: 1, backgroundColor: C.background },
    content: { paddingTop: 60, paddingBottom: SPACING.xxl, paddingHorizontal: SPACING.md, gap: SPACING.md },
    centered: { flex: 1, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center' },
    avatarWrap: { alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.lg },
    avatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.xs },
    avatarInitials: { color: '#fff', fontSize: 28, ...FONT.bold },
    fullNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    fullName: { color: C.text, fontSize: 22, ...FONT.bold },
    email: { color: C.textSecondary, fontSize: 14 },
    card: {
      backgroundColor: C.surface, borderRadius: RADIUS.lg,
      borderWidth: 1, borderColor: C.border, padding: SPACING.md, gap: SPACING.sm,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    sectionTitle: { color: C.text, fontSize: 16, ...FONT.semibold },
    emptyText: { color: C.textMuted, fontSize: 14, textAlign: 'center', paddingVertical: SPACING.sm },
    qrHint: { color: C.textMuted, fontSize: 13 },
    qrWrap: { alignItems: 'center', padding: SPACING.md, backgroundColor: '#ffffff', borderRadius: RADIUS.md },
    qrToken: { color: C.textMuted, fontSize: 12, textAlign: 'center', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
    appearanceRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: C.surface, borderRadius: RADIUS.md,
      borderWidth: 1, borderColor: C.border,
      paddingHorizontal: SPACING.md, paddingVertical: 14,
    },
    appearanceLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
    appearanceLabel: { fontSize: 15, color: C.text, ...FONT.medium },
    appearanceValue: { fontSize: 13, color: C.textSecondary, marginTop: 1 },
    signOutBtn: {
      backgroundColor: C.errorBg, borderRadius: RADIUS.md,
      borderWidth: 1, borderColor: C.error,
      paddingVertical: SPACING.md, alignItems: 'center', marginTop: SPACING.sm,
    },
    signOutText: { color: C.error, fontSize: 16, ...FONT.semibold },
  }), [C]);

  if (loading) {
    return <View style={s.centered}><ActivityIndicator color={theme.primary} /></View>;
  }

  if (!member) {
    return (
      <View style={s.centered}>
        <Text style={{ color: C.textSecondary, fontSize: 16 }}>Could not load profile</Text>
      </View>
    );
  }

  const expiryDate = new Date(member.expiryDate).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const hasProfileData = profile && (profile.age != null || profile.weightKg != null || profile.fitnessGoal != null);

  return (
    <>
      <ScrollView style={s.root} contentContainerStyle={s.content}>
        {/* Avatar */}
        <View style={s.avatarWrap}>
          <View style={[s.avatar, { backgroundColor: theme.primary }]}>
            <Text style={s.avatarInitials}>{getInitials(member.user.fullName)}</Text>
          </View>
          <View style={s.fullNameRow}>
            <Text style={s.fullName}>{member.user.fullName}</Text>
            {equippedBadge && <EquippedBadgeChip badge={toEquippedDisplay(equippedBadge)} size={20} />}
          </View>
          <Text style={s.email}>{member.user.email}</Text>
          <StatusBadge status={member.status} />
        </View>

        {/* Membership */}
        <Pressable
          onPress={() => router.push('/(member)/membership')}
          style={({ pressed }) => [s.card, pressed && { opacity: 0.85 }]}
        >
          <View style={s.cardHeader}>
            <Text style={s.sectionTitle}>Membership</Text>
            <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
          </View>
          <Row label="Membership #" value={member.membershipNumber} C={C} />
          <Row label="Plan" value={member.plan?.name ?? '—'} C={C} />
          <Row label="Expires" value={expiryDate} C={C} />
        </Pressable>

        {/* Fitness Profile */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.sectionTitle}>Fitness Profile</Text>
            <Pressable onPress={() => setEditVisible(true)} style={{ paddingVertical: 4, paddingHorizontal: SPACING.sm }}>
              <Text style={{ color: theme.primary, fontSize: 14, ...FONT.medium }}>Edit</Text>
            </Pressable>
          </View>
          {hasProfileData ? (
            <>
              {profile!.fitnessGoal && <Row label="Goal" value={fmtEnum(profile!.fitnessGoal, GOAL_LABELS)} C={C} />}
              {profile!.activityLevel && <Row label="Activity" value={fmtEnum(profile!.activityLevel, ACTIVITY_LABELS)} C={C} />}
              {profile!.experienceLevel && <Row label="Experience" value={fmtEnum(profile!.experienceLevel, EXPERIENCE_LABELS)} C={C} />}
              {profile!.preferredStyle && <Row label="Style" value={fmtEnum(profile!.preferredStyle, STYLE_LABELS)} C={C} />}
              {profile!.dietType && profile!.dietType !== DietType.NONE && <Row label="Diet" value={fmtEnum(profile!.dietType, DIET_LABELS)} C={C} />}
              {profile!.daysPerWeek != null && <Row label="Days / week" value={`${profile!.daysPerWeek} day${profile!.daysPerWeek !== 1 ? 's' : ''}`} C={C} />}
              {profile!.age != null && <Row label="Age" value={`${profile!.age} yrs`} C={C} />}
              {profile!.weightKg != null && <Row label="Weight" value={`${profile!.weightKg} kg`} C={C} />}
              {profile!.targetWeightKg != null && <Row label="Target" value={`${profile!.targetWeightKg} kg`} C={C} />}
              {profile!.heightCm != null && <Row label="Height" value={`${profile!.heightCm} cm`} C={C} />}
              {profile!.injuries && <Row label="Injuries" value={profile!.injuries} C={C} />}
            </>
          ) : (
            <Text style={s.emptyText}>Tap Edit to complete your fitness profile</Text>
          )}
        </View>

        {/* Badges */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Badges</Text>
          {badges.length === 0
            ? <Text style={s.emptyText}>No badges earned yet.</Text>
            : badges.map((b) => <BadgeItem key={b.id} badge={b} />)
          }
        </View>

        {/* QR Code */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Check-in QR</Text>
          <Text style={s.qrHint}>Show this at the gym to check in</Text>
          <View style={s.qrWrap}>
            <QRCode value={member.qrCodeToken} size={200} backgroundColor="#ffffff" color="#000000" />
          </View>
          <Text style={s.qrToken}>{member.qrCodeToken.slice(0, 8).toUpperCase()}…</Text>
        </View>

        {/* Nav rows */}
        <NavRow icon="flash-outline" label="AI Coach" onPress={() => router.push('/(member)/ai')} C={C} />

        {/* Appearance toggle */}
        <Pressable style={s.appearanceRow} onPress={toggleColorScheme}>
          <View style={s.appearanceLeft}>
            <Ionicons
              name={theme.colorScheme === 'dark' ? 'moon-outline' : 'sunny-outline'}
              size={18}
              color={C.textSecondary}
            />
            <View>
              <Text style={s.appearanceLabel}>Appearance</Text>
              <Text style={s.appearanceValue}>
                {theme.colorScheme === 'dark' ? 'Dark mode' : 'Light mode'}
              </Text>
            </View>
          </View>
          <Switch
            value={theme.colorScheme === 'light'}
            onValueChange={toggleColorScheme}
            trackColor={{ false: C.border, true: theme.primary }}
            thumbColor="#fff"
          />
        </Pressable>

        {/* Sign out */}
        <Pressable
          style={[s.signOutBtn, signingOut && { opacity: 0.6 }]}
          onPress={signingOut ? undefined : handleSignOut}
        >
          <Text style={s.signOutText}>{signingOut ? 'Signing out…' : 'Sign Out'}</Text>
        </Pressable>
      </ScrollView>

      {user && (
        <EditProfileModal
          visible={editVisible}
          initialForm={profileToForm(profile)}
          onClose={() => setEditVisible(false)}
        />
      )}
    </>
  );
}
