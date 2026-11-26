import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text } from '../../components/Text';
import { useTheme } from '../../context/ThemeContext';
import { useDailyNutrition } from '../../hooks/fitness-plan';
import { useFoodLogs } from '../../hooks/nutrition';
import { TodayCard } from '../../components/dashboard/TodayCard';
import { SetupPlanCard } from '../../components/dashboard/SetupPlanCard';
import { Notice, TextButton } from '../../components/onboarding/controls';
import { AddMealSheet } from '../../components/nutrition/AddMealSheet';
import { MealIdeaSheet } from '../../components/nutrition/MealIdeaSheet';
import { formatApiError } from '../../lib/format-error';
import { useReduceMotion } from '../../components/onboarding/use-reduce-motion';

function shiftDate(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function dayLabel(date: string, today: string): string {
  if (date === today) return 'Today';
  if (date === shiftDate(today, -1)) return 'Yesterday';
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/** A short confirmation that slides in after logging, then fades away. */
function useToast() {
  const reduceMotion = useReduceMotion();
  const [message, setMessage] = useState<string | null>(null);
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function show(text: string) {
    if (timer.current) clearTimeout(timer.current);
    setMessage(text);
    // accessibilityLiveRegion only works on Android; announce for VoiceOver too.
    AccessibilityInfo.announceForAccessibility(text);
    anim.setValue(reduceMotion ? 1 : 0);
    if (!reduceMotion) Animated.spring(anim, { toValue: 1, friction: 7, tension: 110, useNativeDriver: true }).start();
    timer.current = setTimeout(() => {
      // Only clear if the fade finished; a new toast during the fade interrupts it.
      Animated.timing(anim, { toValue: 0, duration: 250, useNativeDriver: true }).start(({ finished }) => {
        if (finished) setMessage(null);
      });
    }, 3200);
  }

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return { message, anim, show };
}

export default function NutritionScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const C = theme.colors;

  // `undefined` = today in the gym's timezone; the API tells us which date that is.
  const [date, setDate] = useState<string | undefined>(undefined);
  const dailyQ = useDailyNutrition(date);
  const [todayDate, setTodayDate] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (date === undefined && dailyQ.data?.date) setTodayDate(dailyQ.data.date);
  }, [date, dailyQ.data?.date]);
  const shownDate = date ?? dailyQ.data?.date;
  const isToday = shownDate !== undefined && shownDate === todayDate;

  const logsQ = useFoodLogs(shownDate);
  // Home's "Log a meal" opens this screen with ?add=1 to go straight to the add sheet.
  const params = useLocalSearchParams<{ add?: string }>();
  const [sheet, setSheet] = useState<'add' | 'idea' | null>(params.add ? 'add' : null);
  const toast = useToast();
  const remaining = dailyQ.data?.remaining ?? null;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: C.background }]} edges={['top']}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={10}>
            <Ionicons name="chevron-back" size={24} color={C.text} />
          </Pressable>
          <Text variant="h2" style={{ color: C.text, flex: 1 }}>
            Nutrition
          </Text>
        </View>

        {shownDate && todayDate && (
          <View style={styles.dateRow}>
            <Pressable
              onPress={() => setDate(shiftDate(shownDate, -1))}
              accessibilityRole="button"
              accessibilityLabel="Previous day"
              hitSlop={10}
            >
              <Ionicons name="chevron-back-circle-outline" size={26} color={C.textSecondary} />
            </Pressable>
            <Text variant="bodyMed" style={{ color: C.text, minWidth: 120, textAlign: 'center' }}>
              {dayLabel(shownDate, todayDate)}
            </Text>
            <Pressable
              onPress={() => setDate(shiftDate(shownDate, 1) === todayDate ? undefined : shiftDate(shownDate, 1))}
              disabled={isToday}
              accessibilityRole="button"
              accessibilityLabel="Next day"
              hitSlop={10}
            >
              <Ionicons name="chevron-forward-circle-outline" size={26} color={isToday ? C.border : C.textSecondary} />
            </Pressable>
          </View>
        )}

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {dailyQ.isError && !dailyQ.data && (
            <View style={styles.gap}>
              <Notice tone="error">{formatApiError(dailyQ.error, 'Could not load this day.')}</Notice>
              <TextButton label="Try again" onPress={() => dailyQ.refetch()} />
            </View>
          )}

          {dailyQ.data?.targets ? (
            <TodayCard
              data={dailyQ.data}
              title={shownDate && todayDate ? dayLabel(shownDate, todayDate) : 'Today'}
            />
          ) : dailyQ.data ? (
            <SetupPlanCard
              title="Set up your plan"
              subtitle="Get daily calorie and protein targets to track against."
              onPress={() => router.push('/onboarding')}
            />
          ) : null}

          {/* Log a meal / meal idea — today only (meals are logged at the current time) */}
          {isToday && (
            <View style={styles.actions}>
              <Pressable
                onPress={() => setSheet('add')}
                accessibilityRole="button"
                style={({ pressed }) => [styles.actionMain, { backgroundColor: theme.primary }, pressed && { opacity: 0.9 }]}
              >
                <Ionicons name="add-circle" size={24} color={theme.onPrimary} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMed" style={{ color: theme.onPrimary, fontFamily: 'Inter_600SemiBold' }}>
                    Log a meal
                  </Text>
                  <Text variant="caption" style={{ color: theme.onPrimary, opacity: 0.85 }}>
                    Snap, describe or re-log
                  </Text>
                </View>
              </Pressable>
              {remaining && (
                <Pressable
                  onPress={() => setSheet('idea')}
                  accessibilityRole="button"
                  accessibilityLabel="Meal idea"
                  style={({ pressed }) => [
                    styles.actionSide,
                    { backgroundColor: C.surface, borderColor: theme.primary },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Ionicons name="sparkles-outline" size={22} color={theme.primary} />
                  <Text variant="label" style={{ color: theme.primary, fontFamily: 'Inter_600SemiBold' }}>
                    Meal idea
                  </Text>
                </Pressable>
              )}
            </View>
          )}

          {/* The day's log */}
          <Text variant="label" style={[styles.sectionLabel, { color: C.textSecondary }]}>
            MEALS
          </Text>
          {logsQ.isError ? (
            <View style={styles.gap}>
              <Notice tone="error">{formatApiError(logsQ.error, 'Could not load meals.')}</Notice>
              <TextButton label="Try again" onPress={() => logsQ.refetch()} />
            </View>
          ) : (logsQ.data ?? []).length === 0 ? (
            <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border, alignItems: 'center' }]}>
              <Text variant="label" style={{ color: C.textSecondary }}>
                {isToday ? 'Nothing logged yet today.' : 'Nothing logged this day.'}
              </Text>
            </View>
          ) : (
            <View style={[styles.list, { backgroundColor: C.surface, borderColor: C.border }]}>
              {logsQ.data!.map((log, i) => (
                <View
                  key={log.id}
                  style={[styles.logRow, i > 0 && { borderTopWidth: 1, borderTopColor: C.border }]}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="bodyMed" style={{ color: C.text }} numberOfLines={2}>
                      {log.description}
                    </Text>
                    <Text variant="caption" style={{ color: C.textMuted }}>
                      {new Date(log.loggedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      {log.proteinG !== null ? ` · P ${Math.round(Number(log.proteinG))} g` : ''}
                    </Text>
                  </View>
                  <Text variant="bodyMed" style={{ color: C.text }}>
                    {log.calories ?? '—'} kcal
                  </Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      {toast.message && (
        <Animated.View
          pointerEvents="none"
          accessibilityLiveRegion="polite"
          style={[
            styles.toast,
            {
              backgroundColor: theme.primary,
              opacity: toast.anim,
              transform: [{ translateY: toast.anim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
            },
          ]}
        >
          <Ionicons name="checkmark-circle" size={20} color={theme.onPrimary} />
          <Text variant="bodyMed" style={{ color: theme.onPrimary, flex: 1 }}>
            {toast.message}
          </Text>
        </Animated.View>
      )}

      <AddMealSheet
        visible={sheet === 'add'}
        kcalLeftToday={remaining?.kcal ?? null}
        onClose={() => setSheet(null)}
        onLogged={toast.show}
      />
      {remaining && (
        <MealIdeaSheet
          visible={sheet === 'idea'}
          remaining={{ kcal: remaining.kcal, proteinG: remaining.proteinG }}
          onClose={() => setSheet(null)}
          onLogged={toast.show}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 8 },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, paddingBottom: 8 },
  content: { padding: 16, paddingBottom: 40 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 12, marginBottom: 16 },
  gap: { gap: 8 },
  actions: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  actionMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14 },
  actionSide: { width: 104, borderWidth: 1.5, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 4 },
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sectionLabel: { marginBottom: 8, letterSpacing: 0.8 },
  list: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
});
