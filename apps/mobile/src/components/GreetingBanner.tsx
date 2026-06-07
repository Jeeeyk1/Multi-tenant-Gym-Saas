import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { AnimatedMascot } from './AnimatedMascot';
import { COLORS, FONT, SPACING } from '../constants/theme';

interface GreetingBannerProps {
  name: string;
  streak?: number;
  lastCheckInToday?: boolean;
}

function getGreeting(name: string): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return `Good morning,\n${name}!`;
  if (hour >= 12 && hour < 17) return `Good afternoon,\n${name}!`;
  if (hour >= 17 && hour < 21) return `Good evening,\n${name}!`;
  return `Still grinding,\n${name}?`;
}

function getSubtitle(streak: number, lastCheckInToday: boolean): string {
  if (lastCheckInToday) return "You've already crushed a session today!";
  if (streak >= 3) return `${streak}-day streak — you're on fire!`;
  if (streak > 0) return "Great to see you. Let's make it count.";
  return "Ready to crush your goals today?";
}

export function GreetingBanner({ name, streak = 0, lastCheckInToday = false }: GreetingBannerProps) {
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(textOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(textTranslateY, { toValue: 0, damping: 14, stiffness: 140, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[styles.textSide, { opacity: textOpacity, transform: [{ translateY: textTranslateY }] }]}
      >
        <Text style={styles.greeting}>{getGreeting(name)}</Text>
        <Text style={styles.subtitle}>{getSubtitle(streak, lastCheckInToday)}</Text>
        {streak >= 2 && (
          <View style={styles.streakChip}>
            <Text style={styles.streakText}>🔥 {streak}-day streak</Text>
          </View>
        )}
      </Animated.View>

      <View style={styles.mascotSide}>
        <AnimatedMascot size="md" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: SPACING.lg,
    minHeight: 100,
  },
  textSide: {
    flex: 1,
    paddingRight: SPACING.sm,
    gap: 6,
  },
  greeting: {
    fontSize: 24,
    ...FONT.bold,
    color: COLORS.text,
    lineHeight: 30,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    ...FONT.regular,
    lineHeight: 18,
  },
  streakChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#2A1200',
    borderWidth: 1,
    borderColor: '#FF6B3555',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 4,
  },
  streakText: {
    fontSize: 12,
    color: COLORS.warning,
    ...FONT.semibold,
  },
  mascotSide: {
    width: 90,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 4,
  },
});
