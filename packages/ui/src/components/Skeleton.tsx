import { cn } from '../cn';

/** Placeholder block shaped like the content it stands in for. Prefer a few of these over a spinner. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-shimmer rounded-md bg-border', className)} />;
}
