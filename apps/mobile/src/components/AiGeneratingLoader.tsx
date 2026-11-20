import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import { FONT, SPACING } from '../constants/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const RING = 88;
const R = 34;
const STROKE = 6;
const CIRC = 2 * Math.PI * R;
const ARC = CIRC * 0.4; // portion of the ring that's drawn

/**
 * AI "is working" loader: a sweeping progress ring around a gym icon, with
 * status messages that cycle so the wait feels alive. Self-contained animation
 * (no GIF) and themed with the tenant's primary color.
 */
export function AiGeneratingLoader({
  messages,
  icon = 'barbell',
  title,
}: {
  messages: string[];
  icon?: IconName;
  title?: string;
}) {
  const { theme } = useTheme();
  const C = theme.colors;

  const spin = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 1100, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  useEffect(() => {
    if (messages.length <= 1) return;
    const id = setInterval(() => {
      Animated.timing(fade, { toValue: 0, duration: 240, useNativeDriver: true }).start(() => {
        setMsgIndex((i) => (i + 1) % messages.length);
        Animated.timing(fade, { toValue: 1, duration: 240, useNativeDriver: true }).start();
      });
    }, 2000);
    return () => clearInterval(id);
  }, [messages.length, fade]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={styles.wrap}>
      <View style={styles.stage}>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Svg width={RING} height={RING}>
            <Circle
              cx={RING / 2}
              cy={RING / 2}
              r={R}
              stroke={theme.primary + '2E'}
              strokeWidth={STROKE}
              fill="none"
            />
            <Circle
              cx={RING / 2}
              cy={RING / 2}
              r={R}
              stroke={theme.primary}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={`${ARC} ${CIRC - ARC}`}
              fill="none"
            />
          </Svg>
        </Animated.View>
        <View style={styles.icon}>
          <Ionicons name={icon} size={30} color={theme.primary} />
        </View>
      </View>

      {title ? <Text style={[styles.title, { color: C.text }]}>{title}</Text> : null}
      <Animated.Text style={[styles.msg, { color: C.textSecondary, opacity: fade }]}>
        {messages[msgIndex]}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
    gap: SPACING.sm,
  },
  stage: {
    width: RING,
    height: RING,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  icon: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    ...FONT.bold,
  },
  msg: {
    fontSize: 13,
    ...FONT.regular,
  },
});
