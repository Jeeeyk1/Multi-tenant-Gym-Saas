import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../../context/AuthContext';
import { memberService } from '../../services/member.service';
import type { GymMember } from '../../types';
import { COLORS, FONT, RADIUS, SPACING } from '../../constants/theme';

function getInitials(fullName: string) {
  return fullName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

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

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [member, setMember] = useState<GymMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!user) return;
    memberService
      .getMyMember(user.gymId)
      .then(setMember)
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
        <ActivityIndicator color={COLORS.primary} />
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

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {/* Avatar */}
      <View style={styles.avatarWrap}>
        <View style={styles.avatar}>
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
    backgroundColor: COLORS.primary,
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
  sectionTitle: {
    color: COLORS.text,
    fontSize: 16,
    ...FONT.semibold,
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
});
