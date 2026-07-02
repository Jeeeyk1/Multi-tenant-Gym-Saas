import { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useActivePublicCheckins, useMyMember, useUpdateMyPrivacy, useEquippedBadgesMap } from '../../hooks/members';
import { EquippedBadgeChip } from '../../components/EquippedBadgeChip';
import { useTheme } from '../../context/ThemeContext';
import { FONT, RADIUS, SPACING } from '../../constants/theme';
import type { PublicActiveCheckin } from '../../types';

function relativeFromNow(iso: string): string {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes === 1) return '1 min ago';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours === 1) return '1 hr ago';
  return `${hours} hr ago`;
}

export default function WhosHereScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const C = theme.colors;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1, backgroundColor: C.background },
        content: { padding: SPACING.lg, gap: SPACING.lg, paddingBottom: SPACING.xxl },
        centered: { paddingVertical: SPACING.xxl, alignItems: 'center' },

        totalCard: {
          backgroundColor: C.surface,
          borderRadius: RADIUS.lg,
          borderWidth: 1,
          padding: SPACING.md,
          gap: SPACING.xs,
        },
        totalRow: { flexDirection: 'row', alignItems: 'flex-end', gap: SPACING.sm },
        totalNum: { fontSize: 36, color: C.text, ...FONT.bold },
        totalLabel: { fontSize: 14, color: C.textSecondary, paddingBottom: 6, flexShrink: 1 },
        privateNote: { fontSize: 12, color: C.textMuted, marginTop: SPACING.xs },

        privacyCard: {
          backgroundColor: C.surface,
          borderRadius: RADIUS.lg,
          borderWidth: 1,
          borderColor: C.border,
          padding: SPACING.md,
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.md,
        },
        privacyTitle: { fontSize: 14, color: C.text, ...FONT.semibold },
        privacySub: { fontSize: 12, color: C.textSecondary, marginTop: 2, lineHeight: 17 },

        list: {
          backgroundColor: C.surface,
          borderRadius: RADIUS.lg,
          borderWidth: 1,
          borderColor: C.border,
          overflow: 'hidden',
        },
        personRow: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: SPACING.md,
          paddingVertical: SPACING.sm,
          gap: SPACING.md,
        },
        personRowBorder: { borderTopWidth: 1, borderTopColor: C.border },
        personDot: { width: 10, height: 10, alignItems: 'center', justifyContent: 'center' },
        personDotInner: { width: 8, height: 8, borderRadius: 4 },
        personNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
        personName: { fontSize: 14, color: C.text, ...FONT.semibold },
        personTime: { fontSize: 12, color: C.textMuted, marginTop: 2 },

        emptyCard: {
          backgroundColor: C.surface,
          borderRadius: RADIUS.lg,
          borderWidth: 1,
          borderColor: C.border,
          padding: SPACING.xl,
          alignItems: 'center',
          gap: SPACING.xs,
        },
        emptyTitle: { fontSize: 14, color: C.text, ...FONT.semibold },
        emptySub: { fontSize: 12, color: C.textSecondary, textAlign: 'center', lineHeight: 17 },

        backBtn: { padding: SPACING.md, alignItems: 'center' },
        backBtnText: { fontSize: 14, ...FONT.medium },
      }),
    [C],
  );

  const memberQ = useMyMember();
  const activeQ = useActivePublicCheckins();
  const equippedBadgesQ = useEquippedBadgesMap();
  const privacyMutation = useUpdateMyPrivacy();

  const isHidden = memberQ.data?.privacy?.hideCheckinVisibility ?? true;
  const total = activeQ.data?.totalCount ?? 0;

  const sortedVisible = useMemo(
    () =>
      [...(activeQ.data?.visible ?? [])].sort(
        (a, b) => new Date(b.checkedInAt).getTime() - new Date(a.checkedInAt).getTime(),
      ),
    [activeQ.data?.visible],
  );

  const hiddenCount = Math.max(0, total - sortedVisible.length);

  const onTogglePrivacy = (value: boolean) => {
    // Switch value: true = "visible". DB field: hideCheckinVisibility = !value.
    privacyMutation.mutate({ hideCheckinVisibility: !value });
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Who\'s here',
          headerStyle: { backgroundColor: C.background },
          headerTintColor: C.text,
          headerTitleStyle: { color: C.text, ...FONT.semibold },
        }}
      />
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={activeQ.isRefetching}
            onRefresh={activeQ.refetch}
            tintColor={theme.primary}
          />
        }
      >
        {/* Total count card */}
        <View style={[styles.totalCard, { borderColor: theme.primary + '55' }]}>
          <View style={styles.totalRow}>
            <Text style={styles.totalNum}>{total}</Text>
            <Text style={styles.totalLabel}>
              {total === 1 ? 'member is here right now' : 'members are here right now'}
            </Text>
          </View>
          {hiddenCount > 0 && (
            <Text style={styles.privateNote}>
              {hiddenCount === 1
                ? '1 member is here privately.'
                : `${hiddenCount} members are here privately.`}
            </Text>
          )}
        </View>

        {/* Privacy toggle */}
        <View style={styles.privacyCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.privacyTitle}>Show me in this list</Text>
            <Text style={styles.privacySub}>
              {isHidden
                ? 'You\'re hidden — others see you in the count but not your name.'
                : 'You\'re visible — others see your name and check-in time.'}
            </Text>
          </View>
          <Switch
            value={!isHidden}
            onValueChange={onTogglePrivacy}
            disabled={privacyMutation.isPending}
            trackColor={{ false: C.border, true: theme.primary }}
            thumbColor="#fff"
          />
        </View>

        {/* Visible list */}
        {activeQ.isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={theme.primary} size="large" />
          </View>
        ) : sortedVisible.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="people-outline" size={32} color={C.textMuted} />
            <Text style={styles.emptyTitle}>
              {total === 0 ? 'No one is here right now' : 'Nobody is visible right now'}
            </Text>
            <Text style={styles.emptySub}>
              {total === 0
                ? 'Pull to refresh, or come back later.'
                : 'Members here have chosen to stay private.'}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {sortedVisible.map((row, idx) => (
              <PersonRow
                key={row.memberId}
                row={row}
                badge={equippedBadgesQ.data?.get(row.userId)}
                withBorder={idx > 0}
                styles={styles}
              />
            ))}
          </View>
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

type WhosHereStyles = ReturnType<typeof StyleSheet.create<Record<string, object>>>;

function PersonRow({
  row,
  badge,
  withBorder,
  styles,
}: {
  row: PublicActiveCheckin;
  badge: ReturnType<typeof useEquippedBadgesMap>['data'] extends Map<string, infer V> | undefined ? V | undefined : never;
  withBorder: boolean;
  styles: WhosHereStyles;
}) {
  return (
    <View style={[styles.personRow, withBorder && styles.personRowBorder]}>
      <View style={styles.personDot}>
        <View style={[styles.personDotInner, { backgroundColor: '#10B981' }]} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.personNameRow}>
          <Text style={styles.personName}>{row.fullName}</Text>
          {badge && <EquippedBadgeChip badge={badge} size={14} />}
        </View>
        <Text style={styles.personTime}>{relativeFromNow(row.checkedInAt)}</Text>
      </View>
    </View>
  );
}
