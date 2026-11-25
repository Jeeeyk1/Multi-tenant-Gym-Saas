import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSegments } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { STAFF_COLORS } from '../constants/theme';

/**
 * General-purpose themed loading spinner: weight plates orbiting a dumbbell.
 * Member screens use the gym's accent; staff screens use FitOps staff colors only.
 * Use anywhere a page or section is loading.
 */
export function AppLoader({ size = 52 }: { size?: number }) {
  const { theme } = useTheme();
  const segments = useSegments();
  const color = segments[0] === '(staff)' ? STAFF_COLORS.primary : theme.primary;
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
                backgroundColor: color,
                opacity: opacities[i],
              }}
            />
          </View>
        ))}
      </Animated.View>
      <Ionicons name="barbell" size={iconSize} color={color} />
    </View>
  );
}
