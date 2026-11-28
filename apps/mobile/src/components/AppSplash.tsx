import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Logo, Wordmark } from './Logo';
import { BRAND, FONT } from '../constants/theme';

const TAGLINE = 'Train. Connect. Grow.';
// With reduce motion on, the finished splash is shown still for this long instead of animating in.
const STILL_SPLASH_MS = 1200;

interface AppSplashProps {
  onDone: () => void;
}

export function AppSplash({ onDone }: AppSplashProps) {
  const { width } = useWindowDimensions();
  const { theme } = useTheme();
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const nameOpacity = useRef(new Animated.Value(0)).current;
  const nameY = useRef(new Animated.Value(14)).current;
  const charAnims = useRef(TAGLINE.split('').map(() => new Animated.Value(0))).current;
  const glowScale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const fallback = setTimeout(onDone, 4000);
    let stillTimer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const showStill = () => {
      [logoScale, logoOpacity, nameOpacity, progressAnim, ...charAnims].forEach((value) => value.setValue(1));
      nameY.setValue(0);
      stillTimer = setTimeout(onDone, STILL_SPLASH_MS);
    };

    const playIntro = () => {
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, damping: 10, stiffness: 120, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
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
          Animated.timing(anim, { toValue: 1, duration: 100, useNativeDriver: true }),
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
    };

    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (cancelled) return;
      if (reduceMotion) showStill();
      else playIntro();
    });

    return () => {
      cancelled = true;
      clearTimeout(fallback);
      clearTimeout(stillTimer);
    };
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
          style={[
            styles.glowRing,
            { opacity: glowOpacity, transform: [{ scale: glowScale }], borderColor: theme.primary },
          ]}
        />
        <Animated.View style={{ opacity: logoOpacity, transform: [{ scale: logoScale }] }}>
          <Logo size={90} showText={false} tile={BRAND.white} />
        </Animated.View>
      </View>

      <Animated.View style={{ opacity: nameOpacity, transform: [{ translateY: nameY }], marginBottom: 10 }}>
        <Wordmark size={30} />
      </Animated.View>

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
        <Animated.View style={[styles.progressFill, { width: progressWidth, backgroundColor: theme.primary }]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Matches the native splash, so the hand-off has no color flash.
    backgroundColor: BRAND.navy,
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
  },
  taglineRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  taglineChar: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    ...FONT.regular,
    letterSpacing: 0.3,
  },
  progressTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  progressFill: {
    height: 2,
  },
});
