import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { CoachMascot } from './CoachMascot';
import { useReduceMotion } from './use-reduce-motion';

const COACH_SIZE = 250;
const RING_SIZE = 220;

/** Two soft rings that keep expanding outward behind the coach, in the gym's colour. */
function PulseRings() {
  const { theme } = useTheme();
  const reduceMotion = useReduceMotion();
  const rings = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];

  useEffect(() => {
    if (reduceMotion) return;
    const loops = rings.map((ring, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 1100),
          Animated.timing(ring, { toValue: 1, duration: 2200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(ring, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      ),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);

  return (
    <>
      {/* Faint glow in the gym's colour; the rings carry the motion. */}
      <View style={[styles.disc, { backgroundColor: theme.primary, opacity: 0.08 }]} />
      {!reduceMotion &&
        rings.map((ring, i) => (
          <Animated.View
            key={i}
            style={[
              styles.disc,
              styles.ring,
              {
                borderColor: theme.primary,
                opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
                transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.5] }) }],
              },
            ]}
          />
        ))}
    </>
  );
}

/** The welcome "stage": the coach drops in and floats above the gym-coloured rings. */
export function WelcomeStage({ talking }: { talking: boolean }) {
  return (
    <View style={styles.stage}>
      <View style={styles.rings} pointerEvents="none">
        <PulseRings />
      </View>
      <CoachMascot size={COACH_SIZE} enter talking={talking} shadow />
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { alignItems: 'center', justifyContent: 'center', paddingTop: 12, paddingBottom: 8 },
  rings: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disc: { position: 'absolute', width: RING_SIZE, height: RING_SIZE, borderRadius: RING_SIZE / 2 },
  ring: { backgroundColor: 'transparent', borderWidth: 2 },
});
