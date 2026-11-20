import React from 'react';
import { Text as RNText, type TextProps } from 'react-native';
import { type as typeStyles } from '../theme/typography';

type Variant = keyof typeof typeStyles;

/** Themed Text — always applies the correct font family via `variant` so nothing falls
 * back to the system font by accident. Wraps React Native's Text; usage is unchanged
 * (local `style` overrides win over the variant default, same as before). */
export function Text({ variant = 'body', style, ...props }: TextProps & { variant?: Variant }) {
  return <RNText style={[typeStyles[variant], style]} {...props} />;
}
