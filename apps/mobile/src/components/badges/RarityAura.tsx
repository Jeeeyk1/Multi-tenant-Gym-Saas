import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BadgeRarity } from '../../constants/enums';
import { BADGE_COLORS } from '../../constants/theme';
import { useReduceMotion } from '../onboarding/use-reduce-motion';

// Below this size (chat, leaderboard rows) the medal gets a still glow; BadgeStack adds one
// shared-animation LegendaryFlame beside the row instead.
export const ANIMATE_MIN_SIZE = 40;
const FLAME_ANGLES = [-62, -31, 0, 31, 62];

/** The glow (and, for legendary, flames) drawn behind a rare medal. */
export function RarityAura({ rarity, size }: { rarity: BadgeRarity; size: number }) {
  const reduceMotion = useReduceMotion();
  const animated = !reduceMotion && size >= ANIMATE_MIN_SIZE;
  const legendary = rarity === BadgeRarity.LEGENDARY;
  const glowColor = legendary ? BADGE_COLORS.FLAME_EDGE : BADGE_COLORS.EPIC_GLOW;

  const pulse = useRef(new Animated.Value(0)).current;
  const flicker = useRef(FLAME_ANGLES.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (!animated) return;
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    const flames = legendary
      ? flicker.map((v, i) =>
          Animated.loop(
            Animated.sequence([
              Animated.delay(i * 90),
              Animated.timing(v, { toValue: 1, duration: 320 + i * 40, easing: Easing.out(Easing.quad), useNativeDriver: true }),
              Animated.timing(v, { toValue: 0, duration: 380 + i * 30, easing: Easing.in(Easing.quad), useNativeDriver: true }),
            ]),
          ),
        )
      : [];
    glow.start();
    flames.forEach((f) => f.start());
    return () => {
      glow.stop();
      flames.forEach((f) => f.stop());
    };
  }, [animated, legendary, pulse, flicker]);

  const glowSize = size * 1.35;
  const glowStyle = {
    width: glowSize,
    height: glowSize,
    borderRadius: glowSize / 2,
    backgroundColor: glowColor,
    opacity: animated ? pulse.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.42] }) : 0.28,
    transform: [{ scale: animated ? pulse.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.06] }) : 1 }],
  };

  const flameSize = size * 0.34;
  const radius = size * 0.52;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center]}>
      <Animated.View style={[styles.abs, glowStyle]} />
      {legendary &&
        animated &&
        FLAME_ANGLES.map((deg, i) => {
          const rad = (deg * Math.PI) / 180;
          const v = flicker[i];
          return (
            <Animated.View
              key={deg}
              style={[
                styles.abs,
                {
                  left: size / 2 + Math.sin(rad) * radius - flameSize / 2,
                  top: size / 2 - Math.cos(rad) * radius - flameSize * 0.75,
                  opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }),
                  transform: [
                    { rotate: `${deg}deg` },
                    { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -flameSize * 0.18] }) },
                    { scaleY: v.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.15] }) },
                  ],
                },
              ]}
            >
              <Ionicons name="flame" size={flameSize} color={i % 2 ? BADGE_COLORS.FLAME_CORE : BADGE_COLORS.FLAME_EDGE} />
            </Animated.View>
          );
        })}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  abs: { position: 'absolute' },
});
