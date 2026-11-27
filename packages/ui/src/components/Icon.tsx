import type { CSSProperties } from 'react';
import { cn } from '../cn';

interface IconProps {
  /** An icon from `ionicons/icons` (same set as the mobile app), e.g. `homeOutline`. */
  icon: string;
  size?: number;
  className?: string;
  /** Accessible name. Leave empty for decorative icons next to text. */
  label?: string;
}

/**
 * Ionicons glyph drawn as a CSS mask, so it takes the current text colour (`text-primary` etc.)
 * without loading the Ionicons web component.
 */
export function Icon({ icon, size = 20, className, label }: IconProps) {
  const mask = `url("${icon}") center / contain no-repeat`;
  const style: CSSProperties = { width: size, height: size, mask, WebkitMask: mask };
  return (
    <span
      className={cn('inline-block shrink-0 bg-current', className)}
      style={style}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}
