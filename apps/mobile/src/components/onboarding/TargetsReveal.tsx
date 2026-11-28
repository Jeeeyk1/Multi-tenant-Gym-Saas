import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Text } from '../Text';
import { useTheme } from '../../context/ThemeContext';
import type { DailyTargets } from '../../types';
import { useReduceMotion } from './use-reduce-motion';

/** Counts from 0 to `to` once, or shows `to` straight away with reduce motion on. */
function useCountUp(to: number, delayMs: number): number {
  const reduceMotion = useReduceMotion();
  const [value, setValue] = useState(reduceMotion ? to : 0);
  useEffect(() => {
    if (reduceMotion) {
      setValue(to);
      return;
    }
    const anim = new Animated.Value(0);
    const id = anim.addListener(({ value: v }) => setValue(Math.round(v)));
    Animated.timing(anim, {
      toValue: to,
      duration: 900,
      delay: delayMs,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => anim.removeListener(id);
  }, [to, delayMs, reduceMotion]);
  return value;
}

/** The daily targets, counted up one after another, with a "YOU'RE IN" stamp. */
export function TargetsReveal({ targets }: { targets: DailyTargets }) {
  const { theme } = useTheme();
  const reduceMotion = useReduceMotion();
  const kcal = useCountUp(targets.kcal, 0);
  const protein = useCountUp(targets.proteinG, 250);
  const carbs = useCountUp(targets.carbsG, 450);
  const fat = useCountUp(targets.fatG, 650);
  const water = useCountUp(targets.waterMl, 850);

  const stamp = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  useEffect(() => {
    if (reduceMotion) return;
    Animated.sequence([
      Animated.delay(1300),
      Animated.spring(stamp, { toValue: 1, friction: 5, tension: 140, useNativeDriver: true }),
    ]).start(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  }, [stamp, reduceMotion]);

  return (
    <View style={styles.wrap}>
      <View style={[styles.hero, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <Text variant="caption" style={{ color: theme.colors.textSecondary }}>
          DAILY CALORIES
        </Text>
        <Text variant="display" style={[styles.kcal, { color: theme.colors.text }]} accessibilityLabel={`${targets.kcal} calories a day`}>
          {kcal.toLocaleString()}
        </Text>
        <Animated.View
          style={[
            styles.stamp,
            {
              borderColor: theme.primary,
              opacity: stamp,
              transform: [
                { rotate: '-8deg' },
                { scale: stamp.interpolate({ inputRange: [0, 1], outputRange: [2.2, 1] }) },
              ],
            },
          ]}
        >
          <Text variant="label" style={{ color: theme.accentText, fontFamily: 'Inter_600SemiBold', letterSpacing: 1.5 }}>
            YOU&apos;RE IN
          </Text>
        </Animated.View>
      </View>

      <View style={styles.grid}>
        <Macro label="Protein" value={`${protein} g`} color={theme.primary} />
        <Macro label="Carbs" value={`${carbs} g`} color={theme.secondary} />
        <Macro label="Fat" value={`${fat} g`} color={theme.colors.warning} />
        <Macro label="Water" value={`${(water / 1000).toFixed(1)} L`} color={theme.colors.textSecondary} />
      </View>
    </View>
  );
}

function Macro({ label, value, color }: { label: string; value: string; color: string }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.macro, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <View style={[styles.macroBar, { backgroundColor: color }]} />
      <Text variant="caption" style={{ color: theme.colors.textSecondary }}>
        {label}
      </Text>
      <Text variant="metric" style={{ color: theme.colors.text, fontSize: 20 }}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  hero: { borderWidth: 1, borderRadius: 20, padding: 18, gap: 2 },
  kcal: { fontSize: 44, lineHeight: 50, fontVariant: ['tabular-nums'] },
  stamp: {
    position: 'absolute',
    right: 16,
    top: 22,
    borderWidth: 2,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  macro: { width: '48.4%', borderWidth: 1, borderRadius: 16, padding: 14, gap: 2, overflow: 'hidden' },
  macroBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
});
