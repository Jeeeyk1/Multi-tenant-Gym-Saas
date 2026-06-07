import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, useWindowDimensions, View } from 'react-native';
import { COLORS, FONT } from '../constants/theme';

const TAGLINE = 'Train. Connect. Grow.';

interface AppSplashProps {
  onDone: () => void;
}

export function AppSplash({ onDone }: AppSplashProps) {
  const { width } = useWindowDimensions();

  const mascotScale = useRef(new Animated.Value(0.5)).current;
  const mascotOpacity = useRef(new Animated.Value(0)).current;

  const nameOpacity = useRef(new Animated.Value(0)).current;
  const nameY = useRef(new Animated.Value(14)).current;

  const charAnims = useRef(TAGLINE.split('').map(() => new Animated.Value(0))).current;

  const glowScale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  const progressAnim = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const fallback = setTimeout(onDone, 4000);

    Animated.parallel([
      Animated.spring(mascotScale, { toValue: 1, damping: 10, stiffness: 120, useNativeDriver: true }),
      Animated.timing(mascotOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();

    Animated.sequence([
      Animated.delay(400),
      Animated.parallel([
        Animated.timing(nameOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.spring(nameY, { toValue: 0, damping: 14, stiffness: 130, useNativeDriver: true }),
      ]),
    ]).start();

    Animated.sequence([
      Animated.delay(800),
      Animated.stagger(38, charAnims.map((anim) =>
        Animated.timing(anim, { toValue: 1, duration: 100, useNativeDriver: true })
      )),
    ]).start();

    Animated.sequence([
      Animated.delay(600),
      Animated.parallel([
        Animated.sequence([
          Animated.timing(glowOpacity, { toValue: 0.55, duration: 500, useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]),
        Animated.timing(glowScale, { toValue: 1.7, duration: 1000, useNativeDriver: true }),
      ]),
    ]).start();

    Animated.timing(progressAnim, { toValue: 1, duration: 2000, useNativeDriver: false }).start();

    Animated.sequence([
      Animated.delay(2300),
      Animated.timing(screenOpacity, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start(({ finished }) => { if (finished) onDone(); });

    return () => clearTimeout(fallback);
  }, []);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, width],
  });

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      {/* Logo area with glow ring */}
      <View style={styles.logoArea}>
        <Animated.View
          style={[styles.glowRing, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]}
        />
        <Animated.Text
          style={[styles.mascot, { opacity: mascotOpacity, transform: [{ scale: mascotScale }] }]}
        >
          🐔
        </Animated.Text>
      </View>

      {/* App name */}
      <Animated.Text style={[styles.appName, { opacity: nameOpacity, transform: [{ translateY: nameY }] }]}>
        GainzOS
      </Animated.Text>

      {/* Tagline — character by character */}
      <View style={styles.taglineRow}>
        {TAGLINE.split('').map((char, i) => (
          <Animated.Text key={i} style={[styles.taglineChar, { opacity: charAnims[i] }]}>
            {char}
          </Animated.Text>
        ))}
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoArea: {
    width: 130,
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  glowRing: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  mascot: {
    fontSize: 72,
    lineHeight: 88,
  },
  appName: {
    fontSize: 38,
    color: COLORS.text,
    ...FONT.bold,
    letterSpacing: -1.2,
    marginBottom: 14,
  },
  taglineRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  taglineChar: {
    fontSize: 15,
    color: COLORS.textSecondary,
    ...FONT.regular,
    letterSpacing: 0.3,
  },
  progressTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: COLORS.border,
  },
  progressFill: {
    height: 2,
    backgroundColor: COLORS.primary,
  },
});
