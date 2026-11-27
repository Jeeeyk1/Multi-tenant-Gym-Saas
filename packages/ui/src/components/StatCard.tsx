import type { ReactNode } from 'react';
import { cn } from '../cn';
import { AnimatedNumber } from './AnimatedNumber';

interface StatCardProps {
  label: string;
  /** Numbers count up on first render; strings (e.g. "—") show as is. */
  value: number | string;
  sub?: ReactNode;
  /** Pulsing dot for live numbers, e.g. people in the gym right now. */
  live?: boolean;
  className?: string;
}

/** A KPI tile: label, big number, one line of context. */
export function StatCard({ label, value, sub, live, className }: StatCardProps) {
  return (
    <div className={cn('rounded-xl border border-border bg-surface p-5', className)}>
      <p className="mb-3 flex items-center gap-2 text-eyebrow uppercase text-muted">
        {live ? (
          <span className="relative flex h-2 w-2" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
        ) : null}
        {label}
      </p>
      <p className="tabular font-heading text-heading font-extrabold text-foreground">
        {typeof value === 'number' ? <AnimatedNumber value={value} /> : value}
      </p>
      {sub ? <div className="mt-1.5 text-sm text-muted">{sub}</div> : null}
    </div>
  );
}
