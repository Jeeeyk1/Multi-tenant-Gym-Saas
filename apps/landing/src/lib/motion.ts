import type { CSSProperties } from 'react';

const STAGGER_MS = 80;

export function motionDelay(step: number, stagger = STAGGER_MS): CSSProperties {
  return { '--motion-delay': `${step * stagger}ms` } as CSSProperties;
}
