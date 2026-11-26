import { useEffect, useMemo } from 'react';
import { Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BADGE_COLORS } from '../../constants/theme';
import { useReduceMotion } from '../onboarding/use-reduce-motion';

// Every flame on screen shares one loop, so a chat full of legendary members costs one
// animation instead of one per message. A single timing inside the loop keeps it fully
// native; the up-and-down flicker comes from a 3-point interpolation.
const flicker = new Animated.Value(0);
const loop = Animated.loop(
  Animated.timing(flicker, { toValue: 1, duration: 940, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
);
let users = 0;

function useSharedFlicker(active: boolean) {
  useEffect(() => {
    if (!active) return;
    if (users++ === 0) {
      // A stopped loop stays finished until reset, so reset before every start.
      loop.reset();
      loop.start();
    }
    return () => {
      if (--users === 0) loop.stop();
    };
  }, [active]);
}

/** A small burning flame shown next to the name of someone wearing a legendary badge. */
export function LegendaryFlame({ size = 14 }: { size?: number }) {
  const reduceMotion = useReduceMotion();
  useSharedFlicker(!reduceMotion);
  const style = useMemo(
    () => ({
      opacity: flicker.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0.75, 1, 0.75] }),
      transform: [
        { translateY: flicker.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0, -size * 0.1, 0] }) },
        { scaleY: flicker.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0.9, 1.12, 0.9] }) },
      ],
    }),
    [size],
  );
  return (
    <Animated.View style={reduceMotion ? undefined : style} accessibilityElementsHidden importantForAccessibility="no">
      <Ionicons name="flame" size={size} color={BADGE_COLORS.FLAME_EDGE} />
    </Animated.View>
  );
}
