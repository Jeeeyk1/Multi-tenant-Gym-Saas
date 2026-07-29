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
import { useGymPlans } from '../../hooks/staff';
import { COLORS, SPACING, RADIUS, FONT } from '../../constants/theme';
import type { MembershipPlan } from '../../types';

function formatMoney(n: number): string {
  return `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDuration(days: number): string {
  if (days % 365 === 0) return `${days / 365} year${days / 365 > 1 ? 's' : ''}`;
  if (days % 30 === 0) return `${days / 30} month${days / 30 > 1 ? 's' : ''}`;
  return `${days} days`;
}

function PlanCard({ item }: { item: MembershipPlan }) {
  const { theme } = useTheme();
  const inactive = item.isActive === false;
  return (
    <View style={[styles.card, inactive && styles.cardInactive]}>
      <View style={styles.cardTop}>
        <Text style={styles.planName} numberOfLines={1}>{item.name}</Text>
        <Text style={[styles.price, { color: theme.primary }]}>{formatMoney(item.price)}</Text>
      </View>
      <View style={styles.metaRow}>
        <View style={styles.typePill}>
          <Text style={styles.typePillText}>{item.type}</Text>
        </View>
        <Text style={styles.duration}>{formatDuration(item.durationDays)}</Text>
        {inactive && <Text style={styles.inactiveTag}>Inactive</Text>}
      </View>
      {item.description ? (
        <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
      ) : null}
    </View>
  );
}

export default function StaffPlansScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const plansQ = useGymPlans();
  const plans = plansQ.data ?? [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Membership Plans</Text>
      </View>

      {plansQ.isLoading ? (
        <View style={styles.centered}>
          <AppLoader />
        </View>
      ) : (
        <FlatList
          data={plans}
          keyExtractor={(item) => item.id}
          contentContainerStyle={plans.length === 0 ? styles.listEmpty : styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl refreshing={plansQ.isRefetching} onRefresh={() => plansQ.refetch()} tintColor={theme.primary} />
          }
          renderItem={({ item }) => <PlanCard item={item} />}
          ListHeaderComponent={
            <Text style={styles.hint}>Plans are created and edited on the web dashboard.</Text>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="pricetags-outline" size={48} color={COLORS.border} />
              <Text style={styles.emptyTitle}>No plans yet</Text>
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
  hint: { fontSize: 12, color: COLORS.textMuted, ...FONT.regular, marginBottom: SPACING.md },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  cardInactive: { opacity: 0.6 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm },
  planName: { flex: 1, fontSize: 16, color: COLORS.text, ...FONT.semibold },
  price: { fontSize: 16, ...FONT.bold },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  typePill: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  typePillText: { fontSize: 11, color: COLORS.textMuted, ...FONT.medium },
  duration: { fontSize: 13, color: COLORS.textSecondary, ...FONT.regular },
  inactiveTag: { fontSize: 11, color: COLORS.textMuted, ...FONT.medium },
  description: { fontSize: 13, color: COLORS.textSecondary, ...FONT.regular },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: SPACING.sm },
  emptyTitle: { fontSize: 16, color: COLORS.textSecondary, ...FONT.semibold, marginTop: 8 },
});
