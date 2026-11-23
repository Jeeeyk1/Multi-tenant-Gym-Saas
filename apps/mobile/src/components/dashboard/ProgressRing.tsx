import type { ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

/** A circular progress ring; `progress` above 1 draws a full ring in `overColor`. */
export function ProgressRing({
  size,
  stroke,
  progress,
  color,
  trackColor,
  overColor,
  children,
}: {
  size: number;
  stroke: number;
  progress: number;
  color: string;
  trackColor: string;
  overColor?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(progress, 1));
  const over = progress > 1 && overColor;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={over ? overColor : color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - clamped)}
        />
      </Svg>
      {children}
    </View>
  );
}
