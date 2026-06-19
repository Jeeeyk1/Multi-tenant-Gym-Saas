import { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Logo } from './Logo';

interface AnimatedMascotProps {
  size?: 'lg' | 'md' | 'sm';
  enterAnim?: boolean;
}

const SIZE_MAP = {
  lg: 88,
  md: 60,
  sm: 40,
};

export function AnimatedMascot({ size = 'lg', enterAnim = false }: AnimatedMascotProps) {
  const logoSize = SIZE_MAP[size];
  const { theme } = useTheme();

  const enterScale = useRef(new Animated.Value(enterAnim ? 0.5 : 1)).current;
  const enterY = useRef(new Animated.Value(enterAnim ? 30 : 0)).current;
  const enterOpacity = useRef(new Animated.Value(enterAnim ? 0 : 1)).current;
  const floatY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const startFloat = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(floatY, { toValue: -10, duration: 1400, useNativeDriver: true }),
          Animated.timing(floatY, { toValue: 0, duration: 1400, useNativeDriver: true }),
        ]),
      ).start();
    };

    if (enterAnim) {
      Animated.parallel([
        Animated.spring(enterScale, { toValue: 1, damping: 8, stiffness: 100, useNativeDriver: true }),
        Animated.spring(enterY, { toValue: 0, damping: 10, stiffness: 90, useNativeDriver: true }),
        Animated.timing(enterOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start(startFloat);
    } else {
      startFloat();
    }
  }, []);

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
      {theme.logoUrl ? (
        <Image
          source={{ uri: theme.logoUrl }}
          style={{ width: logoSize, height: logoSize, borderRadius: logoSize / 4 }}
          resizeMode="contain"
        />
      ) : (
        <Logo size={logoSize} showText={false} />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
