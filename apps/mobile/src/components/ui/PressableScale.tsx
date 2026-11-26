import React from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { PRESS_SCALE, SPRING } from '../../theme/motion';

// Reanimated's types resolve the root @types/react (v18, used by web) while this app uses v19,
// so its overloads reject Pressable. It animates fine at runtime; the cast keeps Pressable's props.
const AnimatedPressable = Animated.createAnimatedComponent(Pressable as never) as unknown as React.ComponentType<
  Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle> | object }
>;

type Props = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  /** Scale while pressed. Defaults to PRESS_SCALE. */
  pressedScale?: number;
};

/** A Pressable that shrinks slightly while held and springs back on release. */
export function PressableScale({ style, pressedScale = PRESS_SCALE, onPressIn, onPressOut, disabled, ...props }: Props) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      {...props}
      disabled={disabled}
      onPressIn={(e) => {
        scale.value = withSpring(pressedScale, SPRING.snappy);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, SPRING.bouncy);
        onPressOut?.(e);
      }}
      style={[style, animatedStyle]}
    />
  );
}
