import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { useSegments } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { BRAND, DEFAULT_ACCENT, STAFF_COLORS } from '../constants/theme';
import { useReduceMotion } from './onboarding/use-reduce-motion';

const STEP_MS = 260;
// The mark on its 48-unit grid: three tiles, then the dot.
const GRID = 48;
const PART = 19;
const TILES = [
  { x: 3, y: 3 },
  { x: 3, y: 26 },
  { x: 26, y: 26 },
] as const;
const DOT = { x: 26, y: 3 } as const;

/**
 * Loading indicator: the FitOps mark builds tile by tile, then the dot lands.
 * Member screens use the gym's accent; staff screens use the FitOps staff color.
 */
export function AppLoader({ size = 52 }: { size?: number }) {
  const { theme } = useTheme();
  const segments = useSegments();
  const reduceMotion = useReduceMotion();
  // Staff screens are always dark. Member screens follow the color scheme; Volt is never drawn on a light surface.
  const isStaff = segments[0] === '(staff)';
  const onLight = !isStaff && theme.colorScheme === 'light';
  const tileColor = onLight ? BRAND.navy : BRAND.white;
  const memberAccent = onLight && theme.primary === DEFAULT_ACCENT ? BRAND.navy : theme.primary;
  const accent = isStaff ? STAFF_COLORS.primary : memberAccent;
  const steps = useRef([...TILES, DOT].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (reduceMotion) {
      steps.forEach((s) => s.setValue(1));
      return;
    }
    const build = Animated.stagger(
      STEP_MS,
      steps.map((s) =>
        Animated.timing(s, { toValue: 1, duration: STEP_MS, easing: Easing.out(Easing.back(1.6)), useNativeDriver: true }),
      ),
    );
    const clear = Animated.parallel(steps.map((s) => Animated.timing(s, { toValue: 0, duration: STEP_MS, useNativeDriver: true })));
    const loop = Animated.loop(Animated.sequence([build, Animated.delay(STEP_MS * 2), clear]));
    loop.start();
    return () => loop.stop();
  }, [reduceMotion, steps]);

  const unit = size / GRID;
  const part = PART * unit;
  const piece = (pos: { x: number; y: number }, step: Animated.Value, color: string, radius: number) => (
    <Animated.View
      key={`${pos.x}-${pos.y}`}
      style={{
        position: 'absolute',
        left: pos.x * unit,
        top: pos.y * unit,
        width: part,
        height: part,
        borderRadius: radius,
        backgroundColor: color,
        opacity: step,
        transform: [{ scale: step }],
      }}
    />
  );

  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel="Loading" style={{ width: size, height: size }}>
      {TILES.map((t, i) => piece(t, steps[i], tileColor, 5 * unit))}
      {piece(DOT, steps[TILES.length], accent, part / 2)}
    </View>
  );
}
