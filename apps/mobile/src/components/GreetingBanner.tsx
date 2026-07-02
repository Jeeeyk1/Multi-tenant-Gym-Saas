import React, { useEffect, useRef, useMemo } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { FONT, SPACING, RADIUS } from '../constants/theme';

interface GreetingBannerProps {
  name: string;
  initials: string;
  streak?: number;
  lastCheckInToday?: boolean;
}

function getGreeting(name: string): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return `Good morning,\n${name} 👋`;
  if (hour >= 12 && hour < 17) return `Good afternoon,\n${name} 👋`;
  if (hour >= 17 && hour < 21) return `Good evening,\n${name} 👋`;
  return `Still grinding,\n${name}? 💪`;
}

function getSubtitle(streak: number, lastCheckInToday: boolean): string {
  if (lastCheckInToday) return "You've already crushed a session today.";
  if (streak >= 3) return `${streak}-day streak — you're on fire!`;
  if (streak > 0) return "Great to see you. Let's make it count.";
  return "Ready to crush your goals today?";
}

export function GreetingBanner({
  name,
  initials,
  streak = 0,
  lastCheckInToday = false,
}: GreetingBannerProps) {
  const { theme } = useTheme();
  const C = theme.colors;

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
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: SPACING.lg,
      minHeight: 80,
    },
    textSide: { flex: 1, paddingRight: SPACING.md, gap: 6 },
    greeting: { fontSize: 24, ...FONT.bold, color: C.text, lineHeight: 32 },
    subtitle: { fontSize: 13, color: C.textSecondary, ...FONT.regular, lineHeight: 18 },
    streakChip: {
      alignSelf: 'flex-start',
      backgroundColor: theme.colorScheme === 'dark' ? '#2A1200' : '#FFF7ED',
      borderWidth: 1,
      borderColor: '#FF6B3555',
      borderRadius: RADIUS.full,
      paddingHorizontal: 10,
      paddingVertical: 4,
      marginTop: 4,
    },
    streakText: { fontSize: 12, color: '#F97316', ...FONT.semibold },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
    },
    avatarText: { color: '#fff', fontSize: 15, ...FONT.bold },
  }), [C, theme.primary, theme.colorScheme]);

  return (
    <View style={s.container}>
      <Animated.View
        style={[s.textSide, { opacity: textOpacity, transform: [{ translateY: textTranslateY }] }]}
      >
        <Text style={s.greeting}>{getGreeting(name)}</Text>
        <Text style={s.subtitle}>{getSubtitle(streak, lastCheckInToday)}</Text>
        {streak >= 2 && (
          <View style={s.streakChip}>
            <Text style={s.streakText}>🔥 {streak}-day streak</Text>
          </View>
        )}
      </Animated.View>

      <View style={s.avatar}>
        <Text style={s.avatarText}>{initials}</Text>
      </View>
    </View>
  );
}
