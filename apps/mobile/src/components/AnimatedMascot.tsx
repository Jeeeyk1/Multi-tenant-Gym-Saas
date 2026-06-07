import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

interface AnimatedMascotProps {
  size?: 'lg' | 'md' | 'sm';
  enterAnim?: boolean;
}

const SIZE_MAP = {
  lg: { body: 88, arm: 40, armTop: 14, armRight: -18 },
  md: { body: 60, arm: 28, armTop: 8, armRight: -12 },
  sm: { body: 40, arm: 20, armTop: 4, armRight: -8 },
};

export function AnimatedMascot({ size = 'lg', enterAnim = false }: AnimatedMascotProps) {
  const s = SIZE_MAP[size];

  // Entrance: scale + translateY
  const enterScale = useRef(new Animated.Value(enterAnim ? 0.5 : 1)).current;
  const enterY = useRef(new Animated.Value(enterAnim ? 30 : 0)).current;
  const enterOpacity = useRef(new Animated.Value(enterAnim ? 0 : 1)).current;

  // Continuous float
  const floatY = useRef(new Animated.Value(0)).current;

  // Waving arm rotation
  const waveRot = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animations: Animated.CompositeAnimation[] = [];

    if (enterAnim) {
      animations.push(
        Animated.parallel([
          Animated.spring(enterScale, { toValue: 1, damping: 8, stiffness: 100, useNativeDriver: true }),
          Animated.spring(enterY, { toValue: 0, damping: 10, stiffness: 90, useNativeDriver: true }),
          Animated.timing(enterOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]),
      );
    }

    // Start continuous animations after entrance
    const startContinuous = () => {
      const float = Animated.loop(
        Animated.sequence([
          Animated.timing(floatY, { toValue: -10, duration: 1400, useNativeDriver: true }),
          Animated.timing(floatY, { toValue: 0, duration: 1400, useNativeDriver: true }),
        ]),
      );

      const wave = Animated.loop(
        Animated.sequence([
          Animated.timing(waveRot, { toValue: 1, duration: 220, useNativeDriver: true }),
          Animated.timing(waveRot, { toValue: -1, duration: 220, useNativeDriver: true }),
          Animated.timing(waveRot, { toValue: 1, duration: 220, useNativeDriver: true }),
          Animated.timing(waveRot, { toValue: 0, duration: 220, useNativeDriver: true }),
          Animated.delay(1200),
        ]),
      );

      float.start();
      wave.start();
    };

    if (enterAnim && animations.length > 0) {
      Animated.sequence(animations).start(startContinuous);
    } else {
      startContinuous();
    }
  }, []);

  const rotate = waveRot.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-20deg', '20deg'],
  });

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          opacity: enterOpacity,
          transform: [
            { scale: enterScale },
            { translateY: Animated.add(enterY, floatY) },
          ],
        },
      ]}
    >
      {/* Body */}
      <Text style={{ fontSize: s.body, lineHeight: s.body * 1.2 }}>🐔</Text>

      {/* Waving arm — offset top-right */}
      <Animated.View
        style={[
          styles.arm,
          { top: s.armTop, right: s.armRight, transform: [{ rotate }] },
        ]}
      >
        <Text style={{ fontSize: s.arm }}>👋</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  arm: {
    position: 'absolute',
    transformOrigin: 'bottom left',
  },
});
