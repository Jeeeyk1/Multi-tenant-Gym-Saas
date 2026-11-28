import React, { useEffect, useRef, useMemo } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { CoachMascot } from './onboarding/CoachMascot';
import { useReduceMotion } from './onboarding/use-reduce-motion';
import { FONT, SPACING, RADIUS } from '../constants/theme';

interface GreetingBannerProps {
  name: string;
  streak?: number;
  lastCheckInToday?: boolean;
  /** Calories left today from the member's plan; shown instead of a generic line. */
  kcalLeft?: number | null;
}

type DayPart = { label: string; icon: React.ComponentProps<typeof Ionicons>['name']; motion: 'spin' | 'glow' };

function getDayPart(): DayPart {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return { label: 'GOOD MORNING', icon: 'sunny', motion: 'spin' };
  if (hour >= 12 && hour < 17) return { label: 'GOOD AFTERNOON', icon: 'partly-sunny', motion: 'spin' };
  if (hour >= 17 && hour < 21) return { label: 'GOOD EVENING', icon: 'moon', motion: 'glow' };
  return { label: 'LATE SESSION?', icon: 'moon', motion: 'glow' };
}

function getSubtitle(streak: number, lastCheckInToday: boolean, kcalLeft: number | null | undefined): string {
  if (kcalLeft !== null && kcalLeft !== undefined) {
    const food =
      kcalLeft < 0
        ? `${Math.abs(kcalLeft).toLocaleString()} kcal over today`
        : kcalLeft === 0
          ? 'Right on target today'
          : `${kcalLeft.toLocaleString()} kcal left today`;
    return lastCheckInToday ? `Trained today · ${food}.` : `${food}.`;
  }
  if (lastCheckInToday) return "You've already crushed a session today.";
  if (streak >= 3) return `${streak}-day streak — keep it going.`;
  if (streak > 0) return "Great to see you. Let's make it count.";
  return 'Ready to train today?';
}

/** Sun turns slowly; moon glows. Still with reduce motion on. */
function DayPartIcon({ part, color }: { part: DayPart; color: string }) {
  const reduceMotion = useReduceMotion();
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) return;
    const loop =
      part.motion === 'spin'
        ? Animated.loop(Animated.timing(t, { toValue: 1, duration: 12000, easing: Easing.linear, useNativeDriver: true }))
        : Animated.loop(
            Animated.sequence([
              Animated.timing(t, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
              Animated.timing(t, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ]),
          );
    loop.start();
    return () => loop.stop();
  }, [part.motion, reduceMotion, t]);

  const style =
    part.motion === 'spin'
      ? { transform: [{ rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }
      : {
          opacity: t.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }),
          transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.08] }) }],
        };

  return (
    <Animated.View style={style}>
      <Ionicons name={part.icon} size={14} color={color} />
    </Animated.View>
  );
}

export function GreetingBanner({ name, streak = 0, lastCheckInToday = false, kcalLeft }: GreetingBannerProps) {
  const { theme } = useTheme();
  const C = theme.colors;
  const part = getDayPart();

  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(textOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(textTranslateY, { toValue: 0, damping: 14, stiffness: 140, useNativeDriver: true }),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const s = useMemo(() => StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: SPACING.lg,
      minHeight: 96,
    },
    textSide: { flex: 1, paddingRight: SPACING.sm, gap: 4 },
    dayPart: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    dayPartLabel: { fontSize: 11, color: C.textSecondary, letterSpacing: 1.2, ...FONT.semibold },
    name: { fontSize: 28, ...FONT.display, color: C.text, lineHeight: 34 },
    subtitle: { fontSize: 13, color: C.textSecondary, ...FONT.regular, lineHeight: 18 },
    streakChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      alignSelf: 'flex-start',
      backgroundColor: C.warningBg,
      borderRadius: RADIUS.full,
      paddingHorizontal: 10,
      paddingVertical: 4,
      marginTop: 4,
    },
    streakText: { fontSize: 12, color: C.warning, ...FONT.semibold },
  }), [C]);

  return (
    <View style={s.container}>
      <Animated.View
        style={[s.textSide, { opacity: textOpacity, transform: [{ translateY: textTranslateY }] }]}
        accessible
        accessibilityLabel={`${part.label.toLowerCase()}, ${name}. ${getSubtitle(streak, lastCheckInToday, kcalLeft)}`}
      >
        <View style={s.dayPart}>
          <DayPartIcon part={part} color={theme.accentText} />
          <Text style={s.dayPartLabel}>{part.label}</Text>
        </View>
        <Text style={s.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={s.subtitle}>{getSubtitle(streak, lastCheckInToday, kcalLeft)}</Text>
        {streak >= 2 && (
          <View style={s.streakChip}>
            <Ionicons name="flame" size={13} color={C.warning} />
            <Text style={s.streakText}>{streak}-day streak</Text>
          </View>
        )}
      </Animated.View>

      {/* The coach waves hello; tap it and it jumps. */}
      <CoachMascot size={92} enter />
    </View>
  );
}
