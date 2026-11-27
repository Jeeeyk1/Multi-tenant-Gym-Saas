import type { ReactNode } from 'react';
import { cn } from '../cn';

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const TONES: Record<StatusTone, string> = {
  success: 'bg-success-bg text-success',
  warning: 'bg-warning-bg text-warning',
  danger: 'bg-destructive-bg text-destructive-text',
  info: 'bg-nav-active text-nav-active-foreground',
  neutral: 'bg-hover text-muted',
};

/** Small status label with a dot, e.g. Active / Expired / Trial. Colour is never the only signal: always pass text. */
export function StatusPill({ tone, children, className }: { tone: StatusTone; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm px-2 py-0.5 text-xs font-semibold', TONES[tone], className)}>
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}
