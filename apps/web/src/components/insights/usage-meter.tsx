import { cn } from '@/lib/utils';
import type { AiUsageView } from '@/types/api';

const WARN_AT_PCT = 80;

/** `day` is a calendar date (YYYY-MM-DD) in the gym's timezone, so it's formatted as-is, not shifted. */
function formatDay(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export type UsageState = 'ok' | 'warning' | 'paused' | 'unavailable';

export const isPaused = (state: UsageState) => state === 'paused' || state === 'unavailable';

/**
 * Paused when the gym's monthly allowance or this person's daily questions are used up.
 * Unavailable when the gym's plan doesn't include the assistant. Usage that couldn't be
 * loaded (null) doesn't block; a limit error from the API pauses the chat instead.
 */
export function usageState(usage: AiUsageView | null): UsageState {
  if (!usage) return 'ok';
  const a = usage.assistant;
  if (!a) return 'unavailable';
  if (a.pool.usedPct >= 100 || a.today.used >= a.today.limit) return 'paused';
  if (a.pool.usedPct >= WARN_AT_PCT || a.today.limit - a.today.used <= 3) return 'warning';
  return 'ok';
}

/** This month's AI allowance and today's questions, next to the input. */
export function UsageMeter({ usage }: { usage: AiUsageView | null }) {
  const state = usageState(usage);
  if (state === 'unavailable') {
    return (
      <p role="status" className="text-xs text-muted-foreground max-w-3xl mx-auto mb-2">
        The AI assistant isn&apos;t included in your gym&apos;s current plan.
      </p>
    );
  }
  const a = usage?.assistant;
  if (!a) return null;
  const monthLeft = a.pool.usedPct >= 100;
  const message = monthLeft
    ? `This month's AI allowance is used up. It resets on ${formatDay(a.pool.resetsOn)}.`
    : a.today.used >= a.today.limit
      ? `You've used today's ${a.today.limit} questions. The assistant is available again tomorrow.`
      : state === 'warning'
        ? a.pool.usedPct >= WARN_AT_PCT
          ? `${a.pool.usedPct}% of this month's AI allowance used · resets ${formatDay(a.pool.resetsOn)}`
          : `${a.today.limit - a.today.used} questions left today`
        : `${a.today.used} of ${a.today.limit} questions today · ${a.pool.usedPct}% of this month's allowance`;

  return (
    <div
      role="status"
      className={cn(
        'flex items-center gap-3 text-xs max-w-3xl mx-auto mb-2',
        state === 'ok' && 'text-muted-foreground',
        state === 'warning' && 'text-warning',
        state === 'paused' && 'text-destructive-text',
      )}
    >
      <div
        className="h-1.5 w-24 shrink-0 rounded-pill bg-border overflow-hidden"
        role="meter"
        aria-label="AI allowance used this month"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={a.pool.usedPct}
      >
        <div
          className={cn('h-full', state === 'paused' ? 'bg-destructive' : state === 'warning' ? 'bg-warning' : 'bg-primary')}
          style={{ width: `${a.pool.usedPct}%` }}
        />
      </div>
      <span>{message}</span>
    </div>
  );
}
