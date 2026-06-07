import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Animated,
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { memberService } from '../../services/member.service';
import { GreetingBanner } from '../../components/GreetingBanner';
import { MembershipCard } from '../../components/MembershipCard';
import { COLORS, SPACING, RADIUS, FONT } from '../../constants/theme';
import type { GymMember, CheckIn } from '../../types';

function computeStreak(checkIns: CheckIn[]): { streak: number; lastCheckInToday: boolean } {
  if (!checkIns.length) return { streak: 0, lastCheckInToday: false };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dates = checkIns
    .map((c) => { const d = new Date(c.checkedInAt); d.setHours(0, 0, 0, 0); return d.getTime(); })
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort((a, b) => b - a);
  const lastCheckInToday = dates[0] === today.getTime();
  let streak = lastCheckInToday ? 1 : 0;
  let prev = today.getTime();
  for (let i = lastCheckInToday ? 1 : 0; i < dates.length; i++) {
    if (prev - dates[i] === 86400000) { streak++; prev = dates[i]; } else break;
  }
  return { streak, lastCheckInToday };
}

// Animated press card — scales down slightly on press
function PressCard({
  onPress,
  children,
  style,
}: {
  onPress: () => void;
  children: React.ReactNode;
  style?: object;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const onIn = () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 50 }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30 }).start();
  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable onPress={onPress} onPressIn={onIn} onPressOut={onOut}>
        {children}
      </Pressable>
    </Animated.View>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [member, setMember] = useState<GymMember | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [m, ci] = await Promise.all([
        memberService.getMyMember(user.gymId),
        memberService.getMyCheckIns(user.gymId, 7),
      ]);
      setMember(m);
      setCheckIns(ci);
      setError(null);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message ?? 'Failed to load your data');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  const { streak, lastCheckInToday } = computeStreak(checkIns);
  const firstName = user?.fullName?.split(' ')[0] ?? 'Member';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      showsVerticalScrollIndicator={false}
    >
      <GreetingBanner name={firstName} streak={streak} lastCheckInToday={lastCheckInToday} />

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {member && <MembershipCard member={member} />}

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>

      {/* Featured Check-In card */}
      <PressCard onPress={() => router.push('/(member)/checkin')} style={styles.checkInCardWrap}>
        <LinearGradient
          colors={['#6EE7B7', '#3B82F6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.checkInCard}
        >
          <View style={styles.checkInContent}>
            <View style={styles.checkInTextCol}>
              <Text style={styles.checkInEyebrow}>Ready to train?</Text>
              <Text style={styles.checkInTitle}>Check In Now</Text>
            </View>
            <View style={styles.checkInIconBubble}>
              <Text style={styles.checkInIcon}>⚡</Text>
            </View>
          </View>
        </LinearGradient>
      </PressCard>

      {/* Secondary actions row */}
      <View style={styles.secondaryRow}>
        <PressCard onPress={() => router.push('/(member)/announcements')} style={{ flex: 1 }}>
          <View style={styles.secondaryCard}>
            <Text style={styles.secondaryEmoji}>📢</Text>
            <Text style={styles.secondaryLabel}>News</Text>
          </View>
        </PressCard>
        <PressCard onPress={() => router.push('/(member)/chat')} style={{ flex: 1 }}>
          <View style={styles.secondaryCard}>
            <Text style={styles.secondaryEmoji}>💬</Text>
            <Text style={styles.secondaryLabel}>Chat</Text>
          </View>
        </PressCard>
      </View>

      {/* Recent Check-ins */}
      <Text style={styles.sectionTitle}>Recent Visits</Text>
      {checkIns.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No visits yet. Come say hi! 💪</Text>
        </View>
      ) : (
        <View style={styles.checkInList}>
          {checkIns.slice(0, 5).map((ci) => {
            const dateObj = new Date(ci.checkedInAt);
            const duration = ci.checkedOutAt
              ? Math.round((new Date(ci.checkedOutAt).getTime() - dateObj.getTime()) / 60000)
              : null;
            return (
              <View key={ci.id} style={styles.checkInRow}>
                <View>
                  <Text style={styles.checkInDate}>
                    {dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </Text>
                  <Text style={styles.checkInTime}>
                    {dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                {duration != null && (
                  <Text style={styles.checkInDuration}>{duration} min</Text>
                )}
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  centered: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
  errorBox: {
    backgroundColor: COLORS.errorBg,
    borderWidth: 1,
    borderColor: COLORS.error,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  errorText: { color: COLORS.error, fontSize: 13 },
  sectionTitle: {
    fontSize: 13,
    ...FONT.semibold,
    color: COLORS.textMuted,
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // Featured check-in card
  checkInCardWrap: { marginBottom: SPACING.sm },
  checkInCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
  },
  checkInContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  checkInTextCol: { gap: 4 },
  checkInEyebrow: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.6)',
    ...FONT.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  checkInTitle: {
    fontSize: 22,
    color: '#000',
    ...FONT.bold,
  },
  checkInIconBubble: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkInIcon: { fontSize: 26 },

  // Secondary cards
  secondaryRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  secondaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  secondaryEmoji: { fontSize: 28 },
  secondaryLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    ...FONT.semibold,
  },

  // Recent visits
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyText: { color: COLORS.textSecondary, fontSize: 14 },
  checkInList: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  checkInRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  checkInDate: { fontSize: 14, color: COLORS.text, ...FONT.medium },
  checkInTime: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  checkInDuration: { fontSize: 13, color: COLORS.textMuted, ...FONT.regular },
});
