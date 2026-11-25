import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Text } from '../../components/Text';
import { useTheme } from '../../context/ThemeContext';
import { useBadgeCollection } from '../../hooks/badges';
import { BadgeMedal } from '../../components/badges/BadgeMedal';
import { BadgeDetailSheet } from '../../components/badges/BadgeDetailSheet';
import { CATEGORY_HINT, CATEGORY_LABEL } from '../../components/badges/badge-labels';
import { Notice, TextButton } from '../../components/onboarding/controls';
import { formatApiError } from '../../lib/format-error';
import type { CollectionBadge } from '../../types';

function BadgeCell({ badge, onPress }: { badge: CollectionBadge; onPress: () => void }) {
  const { theme } = useTheme();
  const C = theme.colors;
  const earned = badge.earned;
  const pct = badge.progress ? Math.min(1, badge.progress.current / Math.max(1, badge.progress.target)) : 0;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${badge.name}, ${earned ? (earned.isEquipped ? 'equipped' : 'earned') : 'locked'}${
        !earned && badge.progress ? `, ${badge.progress.current} of ${badge.progress.target} ${badge.progress.unit}` : ''
      }`}
      style={({ pressed }) => [styles.cell, pressed && { opacity: 0.8 }]}
    >
      <View>
        <BadgeMedal category={badge.category} tier={badge.tier} color={badge.color} icon={badge.icon} size={58} locked={!earned} />
        {earned?.isEquipped && (
          <View style={[styles.equippedDot, { backgroundColor: theme.primary, borderColor: C.background }]}>
            <Ionicons name="checkmark" size={11} color={theme.onPrimary} />
          </View>
        )}
      </View>
      <Text variant="caption" style={{ color: earned ? C.text : C.textSecondary, textAlign: 'center' }} numberOfLines={2}>
        {badge.name}
      </Text>
      {!earned && badge.progress && (
        <View style={[styles.bar, { backgroundColor: C.border }]}>
          <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: theme.primary }} />
        </View>
      )}
    </Pressable>
  );
}

export default function BadgesScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const C = theme.colors;
  const collectionQ = useBadgeCollection();
  const [selected, setSelected] = useState<CollectionBadge | null>(null);
  const data = collectionQ.data;

  // Keep the open card in sync after equipping (the collection refetches).
  const selectedNow = selected && data
    ? data.categories.flatMap((c) => c.badges).find((b) => b.key === selected.key) ?? selected
    : selected;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: C.background }]} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </Pressable>
        <Text variant="h2" style={{ color: C.text, flex: 1 }}>
          Badges
        </Text>
        {data && (
          <Text variant="label" style={{ color: C.textSecondary }}>
            {data.earnedCount} of {data.totalCount}
          </Text>
        )}
      </View>

      {collectionQ.isLoading ? (
        <ActivityIndicator style={{ marginTop: 48 }} color={theme.primary} />
      ) : collectionQ.isError || !data ? (
        <View style={styles.content}>
          <Notice tone="error">{formatApiError(collectionQ.error, 'Could not load your badges.')}</Notice>
          <TextButton label="Try again" onPress={() => collectionQ.refetch()} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={collectionQ.isRefetching} onRefresh={() => collectionQ.refetch()} tintColor={theme.primary} />}
        >
          <Text variant="label" style={{ color: C.textSecondary }}>
            EQUIPPED · ONE PER CATEGORY
          </Text>
          <View style={styles.slots}>
            {data.categories.map(({ category, equipped }) => (
              <Pressable
                key={category}
                onPress={() => equipped && setSelected(equipped)}
                disabled={!equipped}
                accessibilityRole={equipped ? 'button' : undefined}
                accessibilityLabel={`${CATEGORY_LABEL[category]}: ${equipped ? equipped.name : 'empty'}`}
                style={[
                  styles.slot,
                  { borderColor: C.border, backgroundColor: C.surface },
                  !equipped && { borderStyle: 'dashed' },
                ]}
              >
                <Text variant="caption" style={{ color: C.textMuted, letterSpacing: 0.6 }}>
                  {CATEGORY_LABEL[category].toUpperCase()}
                </Text>
                {equipped ? (
                  <>
                    <BadgeMedal category={category} tier={equipped.tier} color={equipped.color} icon={equipped.icon} size={46} />
                    <Text variant="caption" style={{ color: C.text, textAlign: 'center' }} numberOfLines={2}>
                      {equipped.name}
                    </Text>
                  </>
                ) : (
                  <>
                    <View style={[styles.emptyMedal, { borderColor: C.border }]}>
                      <Ionicons name="add" size={20} color={C.textMuted} />
                    </View>
                    <Text variant="caption" style={{ color: C.textMuted, textAlign: 'center' }}>
                      Tap a badge below
                    </Text>
                  </>
                )}
              </Pressable>
            ))}
          </View>

          {data.categories.map(({ category, badges }) =>
            badges.length === 0 ? null : (
              <View key={category} style={styles.section}>
                <View style={{ gap: 2 }}>
                  <Text variant="h3" style={{ color: C.text }}>
                    {CATEGORY_LABEL[category]}
                  </Text>
                  <Text variant="caption" style={{ color: C.textSecondary }}>
                    {CATEGORY_HINT[category]} · {badges.filter((b) => b.earned).length} of {badges.length}
                  </Text>
                </View>
                <View style={styles.grid}>
                  {badges.map((b) => (
                    <BadgeCell key={b.key} badge={b} onPress={() => setSelected(b)} />
                  ))}
                </View>
              </View>
            ),
          )}
        </ScrollView>
      )}

      <BadgeDetailSheet badge={selectedNow} onClose={() => setSelected(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 8 },
  content: { padding: 16, paddingBottom: 40, gap: 14 },
  slots: { flexDirection: 'row', gap: 8 },
  slot: { flex: 1, borderWidth: 1.5, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 6, alignItems: 'center', gap: 6 },
  emptyMedal: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  section: { gap: 12, marginTop: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 16 },
  cell: { width: '33.33%', alignItems: 'center', gap: 6, paddingHorizontal: 4 },
  equippedDot: { position: 'absolute', right: -2, bottom: -2, width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  bar: { width: '70%', height: 4, borderRadius: 2, overflow: 'hidden' },
});
