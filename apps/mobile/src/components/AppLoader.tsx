import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

/**
 * General-purpose themed loading spinner: weight plates orbiting a dumbbell.
 * Fully theme-aware (colors come from the tenant's primary), no image assets.
 * Use anywhere a page or section is loading.
 */
export function AppLoader({ size = 52 }: { size?: number }) {
  const { theme } = useTheme();
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 1500, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const dot = Math.max(6, Math.round(size * 0.15));
  const iconSize = Math.round(size * 0.6);
  const opacities = [1, 0.6, 0.35];

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate }] }]}>
        {[0, 120, 240].map((deg, i) => (
          <View
            key={deg}
            style={[StyleSheet.absoluteFill, { alignItems: 'center', transform: [{ rotate: `${deg}deg` }] }]}
          >
            <View
              style={{
                width: dot,
                height: dot,
                borderRadius: dot / 2,
                backgroundColor: theme.primary,
                opacity: opacities[i],
              }}
            />
          </View>
        ))}
      </Animated.View>
      <Ionicons name="barbell" size={iconSize} color={theme.primary} />
    </View>
  );
}
