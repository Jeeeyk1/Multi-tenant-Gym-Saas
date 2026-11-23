import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useReduceMotion } from './use-reduce-motion';
import COACH from '../../../assets/mascot/coach-wave.png';

interface CoachMascotProps {
  size: number;
  /** Bounce in from above when first shown. */
  enter?: boolean;
  /** Little hops while the coach is "talking" (typing a message). */
  talking?: boolean;
  /** Soft shadow on the "floor" under the floating mascot. */
  shadow?: boolean;
}

/**
 * The coach, free-floating on the screen: bobs and sways while idle, hops while
 * talking, and jumps when tapped. All motion stops with reduce motion on.
 */
export function CoachMascot({ size, enter = false, talking = false, shadow = false }: CoachMascotProps) {
  const reduceMotion = useReduceMotion();
  const entrance = useRef(new Animated.Value(enter ? 0 : 1)).current;
  const float = useRef(new Animated.Value(0)).current;
  const hop = useRef(new Animated.Value(0)).current;
  const jump = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      entrance.setValue(1);
      return;
    }
    if (enter) {
      Animated.spring(entrance, { toValue: 1, friction: 5, tension: 70, useNativeDriver: true }).start();
    }
    const loop = Animated.loop(
      Animated.timing(float, { toValue: 1, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [enter, entrance, float, reduceMotion]);

  useEffect(() => {
    if (reduceMotion || !talking) {
      hop.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(hop, { toValue: 1, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(hop, { toValue: 0, duration: 180, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.delay(120),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [talking, hop, reduceMotion]);

  function onTap() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (reduceMotion) return;
    jump.setValue(0);
    Animated.sequence([
      Animated.timing(jump, { toValue: 1, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(jump, { toValue: 0, friction: 4, tension: 120, useNativeDriver: true }),
    ]).start();
  }

  // float: 0→1 is one full cycle, mapped to up/down and a gentle side-to-side sway.
  const floatY = float.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -size * 0.06, 0] });
  const sway = float.interpolate({ inputRange: [0, 0.25, 0.75, 1], outputRange: ['0deg', '3deg', '-3deg', '0deg'] });
  const hopY = hop.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.04] });
  const jumpY = jump.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.25] });
  const jumpSpin = jump.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-8deg'] });
  const enterY = entrance.interpolate({ inputRange: [0, 1], outputRange: [-size * 0.8, 0] });
  const enterScaleY = entrance.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1.15, 0.92, 1] });
  // The shadow shrinks and fades as the mascot rises.
  const shadowScale = float.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.85, 1] });

  return (
    <Pressable onPress={onTap} accessibilityRole="image" accessibilityLabel="Your coach, waving">
      <Animated.View
        style={{
          opacity: entrance,
          transform: [
            { translateY: Animated.add(Animated.add(floatY, hopY), Animated.add(jumpY, enterY)) },
            { rotate: sway },
            { rotate: jumpSpin },
            { scaleY: enterScaleY },
          ],
        }}
      >
        <Image source={COACH} style={{ width: size, height: size }} resizeMode="contain" />
      </Animated.View>
      {shadow && (
        <View style={styles.shadowWrap}>
          <Animated.View
            style={[
              styles.shadow,
              { width: size * 0.5, height: size * 0.06, borderRadius: size, transform: [{ scaleX: shadowScale }] },
            ]}
          />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shadowWrap: { alignItems: 'center', marginTop: -6 },
  shadow: { backgroundColor: 'rgba(0,0,0,0.18)' },
});
