import { ReduceMotion, type WithSpringConfig } from 'react-native-reanimated';

// The only three springs the app animates with. Pick by feel, never add a fourth:
// - snappy: presses, toggles, checkmarks
// - gentle: sheets, screens, progress rings, lists
// - bouncy: tab indicator, toasts, badges, chips
// ReduceMotion.System makes every spring jump to its end value when the OS asks for less motion.
export const SPRING = {
  snappy: { stiffness: 420, damping: 34, mass: 1, reduceMotion: ReduceMotion.System },
  gentle: { stiffness: 170, damping: 24, mass: 1, reduceMotion: ReduceMotion.System },
  bouncy: { stiffness: 300, damping: 16, mass: 1, reduceMotion: ReduceMotion.System },
} satisfies Record<string, WithSpringConfig>;

/** How far a pressable shrinks while held. */
export const PRESS_SCALE = 0.96;
