import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Text } from '../Text';
import { useTheme } from '../../context/ThemeContext';
import { CoachMascot } from '../onboarding/CoachMascot';
import { useReduceMotion } from '../onboarding/use-reduce-motion';

const LINE_MS = 1600;

/**
 * "The coach is thinking": the mascot hops, a status line cycles through `lines`,
 * and a shimmering placeholder hints at the result that's coming.
 */
export function AiThinking({ lines }: { lines: string[] }) {
  const { theme } = useTheme();
  const C = theme.colors;
  const reduceMotion = useReduceMotion();
  const [index, setIndex] = useState(0);
  const shimmer = useRef(new Animated.Value(0)).current;
  const lineFade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (lines.length < 2) return;
    const timer = setInterval(() => {
      if (reduceMotion) {
        setIndex((i) => (i + 1) % lines.length);
        return;
      }
      Animated.timing(lineFade, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
        setIndex((i) => (i + 1) % lines.length);
        Animated.timing(lineFade, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      });
    }, LINE_MS);
    return () => clearInterval(timer);
  }, [lines.length, lineFade, reduceMotion]);

  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer, reduceMotion]);

  const barOpacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.8] });

  return (
    <View style={styles.wrap} accessibilityRole="progressbar" accessibilityLabel={lines[index]} accessibilityLiveRegion="polite">
      <CoachMascot size={96} talking />
      <Animated.View style={{ opacity: lineFade }}>
        <Text variant="bodyMed" style={{ color: C.text, textAlign: 'center' }}>
          {lines[index]}
        </Text>
      </Animated.View>
      {/* Placeholder for the result card */}
      <View style={[styles.skeleton, { borderColor: C.border, backgroundColor: C.surface }]}>
        <Animated.View style={[styles.barBig, { backgroundColor: C.border, opacity: barOpacity }]} />
        <View style={styles.row}>
          {[0, 1, 2].map((i) => (
            <Animated.View key={i} style={[styles.pill, { backgroundColor: C.border, opacity: barOpacity }]} />
          ))}
        </View>
        <Animated.View style={[styles.barSmall, { backgroundColor: C.border, opacity: barOpacity }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 14, paddingVertical: 8 },
  skeleton: { alignSelf: 'stretch', borderWidth: 1, borderRadius: 16, padding: 16, gap: 12 },
  barBig: { height: 28, width: '45%', borderRadius: 8 },
  row: { flexDirection: 'row', gap: 8 },
  pill: { height: 22, flex: 1, borderRadius: 11 },
  barSmall: { height: 12, width: '70%', borderRadius: 6 },
});
