import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useTheme } from '../../context/ThemeContext';
import { fonts } from '../../theme/typography';
import { SPRING } from '../../theme/motion';
import { haptic } from '../../lib/haptics';

const HEIGHT = 60;
const PAD = 4;
const KNOB = HEIGHT - PAD * 2;
/** How far (as a share of the track) the knob must travel before release confirms. */
const THRESHOLD = 0.85;

interface SlideToConfirmProps {
  label: string;
  onConfirm: () => void;
  /** Shows a spinner in the knob. When it turns false again the knob slides back. */
  loading?: boolean;
  disabled?: boolean;
}

/**
 * Drag the knob to the end to confirm. Used where an accidental tap would be a problem,
 * e.g. checking in from a phone in a pocket. Screen-reader users confirm with a double-tap.
 */
export function SlideToConfirm({ label, onConfirm, loading = false, disabled = false }: SlideToConfirmProps) {
  const { theme } = useTheme();
  const C = theme.colors;
  const x = useSharedValue(0);
  const start = useSharedValue(0);
  const max = useSharedValue(0);
  const shimmer = useSharedValue(1);

  useEffect(() => {
    shimmer.value = withRepeat(withTiming(0.55, { duration: 1100, reduceMotion: ReduceMotion.System }), -1, true);
  }, [shimmer]);

  useEffect(() => {
    if (!loading) x.value = withSpring(0, SPRING.bouncy);
  }, [loading, x]);

  const confirm = () => {
    haptic.press();
    onConfirm();
  };

  const pan = Gesture.Pan()
    .enabled(!disabled && !loading)
    .onBegin(() => {
      start.value = x.value;
    })
    .onUpdate((e) => {
      x.value = Math.min(max.value, Math.max(0, start.value + e.translationX));
    })
    .onEnd(() => {
      if (max.value > 0 && x.value >= max.value * THRESHOLD) {
        x.value = withSpring(max.value, SPRING.snappy);
        scheduleOnRN(confirm);
      } else {
        x.value = withSpring(0, SPRING.bouncy);
      }
    });

  // A plain tap nudges the knob to show that it slides.
  const tap = Gesture.Tap()
    .enabled(!disabled && !loading)
    .onEnd(() => {
      x.value = withSequence(withSpring(Math.min(44, max.value), SPRING.snappy), withSpring(0, SPRING.bouncy));
    });

  const knobStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const fillStyle = useAnimatedStyle(() => ({ width: x.value + KNOB + PAD * 2 }));
  const labelStyle = useAnimatedStyle(() => ({
    opacity: max.value > 0 ? Math.max(0, 1 - x.value / (max.value * 0.6)) * shimmer.value : shimmer.value,
  }));

  const onLayout = (e: LayoutChangeEvent) => {
    max.value = Math.max(0, e.nativeEvent.layout.width - KNOB - PAD * 2);
  };

  return (
    <View
      onLayout={onLayout}
      style={[styles.track, { backgroundColor: C.surface, borderColor: C.border, opacity: disabled ? 0.5 : 1 }]}
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Slide the button to the right to confirm"
      accessibilityState={{ disabled, busy: loading }}
      accessibilityActions={[{ name: 'activate' }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'activate' && !disabled && !loading) confirm();
      }}
    >
      <Animated.View style={[styles.fill, { backgroundColor: theme.primaryMuted }, fillStyle]} />
      <Animated.Text style={[styles.label, { color: C.text }, labelStyle]} numberOfLines={1}>
        {label}
      </Animated.Text>
      <GestureDetector gesture={Gesture.Race(pan, tap)}>
        <Animated.View style={[styles.knob, { backgroundColor: theme.primary }, knobStyle]}>
          {loading ? (
            <ActivityIndicator color={theme.onPrimary} />
          ) : (
            <Ionicons name="arrow-forward" size={24} color={theme.onPrimary} />
          )}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: HEIGHT, borderRadius: 18, borderWidth: 1, justifyContent: 'center', overflow: 'hidden' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  label: { textAlign: 'center', paddingLeft: KNOB, fontFamily: fonts.headingBold, fontSize: 15 },
  knob: {
    position: 'absolute',
    left: PAD - 1,
    top: PAD - 1,
    width: KNOB,
    height: KNOB,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
