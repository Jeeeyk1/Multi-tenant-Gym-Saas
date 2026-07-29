import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { AppLoader } from '../../components/AppLoader';
import { useGymRenewals } from '../../hooks/staff';
import { COLORS, SPACING, RADIUS, FONT } from '../../constants/theme';
import type { GymRenewal } from '../../types';

const METHOD_LABEL: Record<string, string> = {
  CASH: 'Cash',
  GCASH: 'GCash',
  BANK_TRANSFER: 'Bank Transfer',
  CREDIT_CARD: 'Card',
};

function formatMoney(n: number): string {
  return `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function RenewalRow({ item }: { item: GymRenewal }) {
  const { theme } = useTheme();
  return (
    <View style={styles.row}>
      <View style={styles.rowTop}>
        <Text style={styles.name} numberOfLines={1}>{item.member.user.fullName}</Text>
        <Text style={[styles.amount, { color: theme.primary }]}>{formatMoney(item.amountPaid)}</Text>
      </View>
      <View style={styles.rowMeta}>
        <Text style={styles.metaText} numberOfLines={1}>
          {item.member.membershipPlan?.name ?? 'No plan'}
          {item.paymentMethod ? ` · ${METHOD_LABEL[item.paymentMethod] ?? item.paymentMethod}` : ''}
        </Text>
        <Text style={styles.metaText}>{formatDate(item.renewedAt)}</Text>
      </View>
      <View style={styles.rowMeta}>
        <Text style={styles.subText}>New expiry {formatDate(item.newExpiry)}</Text>
        <Text style={styles.subText}>by {item.renewedByUser.fullName}</Text>
      </View>
    </View>
  );
}

export default function StaffRenewalsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const renewalsQ = useGymRenewals();
  const renewals = renewalsQ.data ?? [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Renewals</Text>
      </View>

      {renewalsQ.isLoading ? (
        <View style={styles.centered}>
          <AppLoader />
        </View>
      ) : (
        <FlatList
          data={renewals}
          keyExtractor={(item) => item.id}
          contentContainerStyle={renewals.length === 0 ? styles.listEmpty : styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl
              refreshing={renewalsQ.isRefetching}
              onRefresh={() => renewalsQ.refetch()}
              tintColor={theme.primary}
            />
          }
          renderItem={({ item }) => <RenewalRow item={item} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="refresh-circle-outline" size={48} color={COLORS.border} />
              <Text style={styles.emptyTitle}>No renewals yet</Text>
              <Text style={styles.emptySub}>Renewals are recorded from a member&apos;s profile.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

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
  screenTitle: { fontSize: 22, color: COLORS.text, ...FONT.bold },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: SPACING.lg },
  listEmpty: { flex: 1 },
  separator: { height: SPACING.md },

  row: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    gap: 6,
  },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm },
  name: { flex: 1, fontSize: 15, color: COLORS.text, ...FONT.semibold },
  amount: { fontSize: 15, ...FONT.bold },
  rowMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm },
  metaText: { fontSize: 13, color: COLORS.textSecondary, ...FONT.regular },
  subText: { fontSize: 12, color: COLORS.textMuted, ...FONT.regular },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: SPACING.sm },
  emptyTitle: { fontSize: 16, color: COLORS.textSecondary, ...FONT.semibold, marginTop: 8 },
  emptySub: { fontSize: 13, color: COLORS.textMuted, ...FONT.regular, textAlign: 'center' },
});
