import React from 'react';
import { View, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Platform } from 'react-native';
import { Text } from '../../components/Text';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppLoader } from '../../components/AppLoader';
import { useGymPlans } from '../../hooks/staff';
import { STAFF_COLORS as COLORS, SPACING, RADIUS, FONT, STAFF_SURFACE_RAISED } from '../../constants/theme';
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
  const inactive = item.isActive === false;
  return (
    <View style={[styles.card, inactive && styles.cardInactive]}>
      <View style={styles.cardTop}>
        <Text style={styles.planName} numberOfLines={1}>{item.name}</Text>
        <Text style={[styles.price, { color: COLORS.primary }]}>{formatMoney(item.price)}</Text>
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
            <RefreshControl refreshing={plansQ.isRefetching} onRefresh={() => plansQ.refetch()} tintColor={COLORS.primary} />
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
  // 44pt tap target; pulled left so the arrow lines up with the content edge.
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -10, marginRight: -6 },
  screenTitle: { fontSize: 22, color: COLORS.text, ...FONT.bold },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: SPACING.lg },
  listEmpty: { flex: 1 },
  separator: { height: SPACING.md },
  hint: { fontSize: 12, color: COLORS.textMuted, ...FONT.regular, marginBottom: SPACING.md },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
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
    backgroundColor: STAFF_SURFACE_RAISED,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  typePillText: { fontSize: 11, color: COLORS.textSecondary, ...FONT.semibold },
  duration: { fontSize: 13, color: COLORS.textSecondary, ...FONT.regular },
  inactiveTag: { fontSize: 11, color: COLORS.textMuted, ...FONT.medium },
  description: { fontSize: 13, color: COLORS.textSecondary, ...FONT.regular },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: SPACING.sm },
  emptyTitle: { fontSize: 16, color: COLORS.textSecondary, ...FONT.semibold, marginTop: 8 },
});
