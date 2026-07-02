import { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMyMember, useMyRenewals } from '../../hooks/members';
import { useTheme } from '../../context/ThemeContext';
import { FONT, RADIUS, SPACING } from '../../constants/theme';
import type { ColorPalette } from '../../constants/theme';
import type { GymMember, MembershipRenewal } from '../../types';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function daysUntil(iso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(iso);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

function expiryCopy(member: GymMember, C: ColorPalette): { text: string; color: string } {
  const days = daysUntil(member.expiryDate);
  if (member.status === 'EXPIRED' || days < 0) {
    return { text: `Expired ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`, color: C.error };
  }
  if (member.status === 'SUSPENDED') {
    return { text: 'Membership suspended', color: C.warning };
  }
  if (days === 0) return { text: 'Expires today', color: C.warning };
  if (days <= 7) return { text: `${days} day${days === 1 ? '' : 's'} left`, color: C.warning };
  return { text: `${days} days left`, color: C.success };
}

export default function MembershipScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const C = theme.colors;
  const memberQ = useMyMember();
  const renewalsQ = useMyRenewals();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1, backgroundColor: C.background },
        content: { padding: SPACING.lg, gap: SPACING.lg, paddingBottom: SPACING.xxl },
        centered: { paddingVertical: SPACING.xxl, alignItems: 'center' },

        card: {
          backgroundColor: C.surface,
          borderRadius: RADIUS.lg,
          borderWidth: 1,
          borderColor: C.border,
          padding: SPACING.md,
          gap: SPACING.sm,
        },
        cardTitle: {
          color: C.text,
          fontSize: 16,
          ...FONT.semibold,
          marginBottom: SPACING.xs,
        },

        row: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingVertical: 4,
        },
        rowLabel: { color: C.textSecondary, fontSize: 14 },
        rowValue: { color: C.text, fontSize: 14, ...FONT.medium },

        expiryBadge: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          alignSelf: 'flex-start',
          paddingHorizontal: SPACING.sm,
          paddingVertical: 6,
          borderRadius: RADIUS.full,
          marginTop: SPACING.xs,
        },
        expiryBadgeText: { fontSize: 13, ...FONT.semibold },

        helpText: {
          color: C.textMuted,
          fontSize: 12,
          lineHeight: 17,
          marginTop: SPACING.sm,
        },

        section: { gap: SPACING.sm },
        sectionTitle: {
          color: C.textMuted,
          fontSize: 12,
          ...FONT.semibold,
          textTransform: 'uppercase',
          letterSpacing: 0.8,
        },

        renewalRow: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: SPACING.sm,
          gap: SPACING.md,
        },
        renewalRowBorder: { borderTopWidth: 1, borderTopColor: C.border },
        renewalDate: { color: C.text, fontSize: 14, ...FONT.semibold },
        renewalSub: { color: C.textSecondary, fontSize: 12, marginTop: 2 },
        renewalAmount: { color: C.text, fontSize: 15, ...FONT.bold },

        emptyCard: {
          backgroundColor: C.surface,
          borderRadius: RADIUS.lg,
          borderWidth: 1,
          borderColor: C.border,
          padding: SPACING.xl,
          alignItems: 'center',
          gap: SPACING.sm,
        },
        emptyText: { color: C.textMuted, fontSize: 14 },

        errorText: {
          color: C.textMuted,
          fontSize: 14,
          textAlign: 'center',
          paddingVertical: SPACING.xl,
        },

        backBtn: { padding: SPACING.md, alignItems: 'center' },
        backBtnText: { fontSize: 14, ...FONT.medium },
      }),
    [C],
  );

  const isLoading = memberQ.isLoading || renewalsQ.isLoading;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Membership',
          headerStyle: { backgroundColor: C.background },
          headerTintColor: C.text,
          headerTitleStyle: { color: C.text, ...FONT.semibold },
        }}
      />
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={theme.primary} size="large" />
          </View>
        ) : memberQ.data ? (
          <>
            <CurrentCard member={memberQ.data} styles={styles} C={C} />
            <RenewalsSection renewals={renewalsQ.data ?? []} styles={styles} C={C} />
          </>
        ) : (
          <Text style={styles.errorText}>
            Couldn't load your membership. Pull to refresh or try again later.
          </Text>
        )}

        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.8 }]}
        >
          <Text style={[styles.backBtnText, { color: theme.primary }]}>← Back</Text>
        </Pressable>
      </ScrollView>
    </>
  );
}

type MembershipStyles = ReturnType<typeof StyleSheet.create<Record<string, object>>>;

function CurrentCard({ member, styles, C }: { member: GymMember; styles: MembershipStyles; C: ColorPalette }) {
  const expiry = expiryCopy(member, C);
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Current membership</Text>
      <Row label="Plan" value={member.plan?.name ?? '—'} styles={styles} />
      <Row label="Membership #" value={member.membershipNumber} styles={styles} />
      <Row label="Expires" value={formatDate(member.expiryDate)} styles={styles} />
      <View style={[styles.expiryBadge, { backgroundColor: expiry.color + '22' }]}>
        <Ionicons name="time-outline" size={14} color={expiry.color} />
        <Text style={[styles.expiryBadgeText, { color: expiry.color }]}>{expiry.text}</Text>
      </View>
      <Text style={styles.helpText}>
        To renew, visit your gym front desk. Staff will process the payment and update your expiry.
      </Text>
    </View>
  );
}

function RenewalsSection({ renewals, styles, C }: { renewals: MembershipRenewal[]; styles: MembershipStyles; C: ColorPalette }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Renewal history</Text>
      {renewals.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="document-text-outline" size={32} color={C.textMuted} />
          <Text style={styles.emptyText}>No renewals yet</Text>
        </View>
      ) : (
        <View style={styles.card}>
          {renewals.map((r, idx) => (
            <View
              key={r.id}
              style={[styles.renewalRow, idx > 0 && styles.renewalRowBorder]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.renewalDate}>{formatDate(r.renewedAt)}</Text>
                <Text style={styles.renewalSub}>
                  Extended to {formatDate(r.newExpiry)}
                </Text>
                {r.paymentMethod && (
                  <Text style={styles.renewalSub}>via {r.paymentMethod}</Text>
                )}
              </View>
              <Text style={styles.renewalAmount}>{formatCurrency(r.amountPaid)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function Row({ label, value, styles }: { label: string; value: string; styles: MembershipStyles }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}
