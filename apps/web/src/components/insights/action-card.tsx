import { cn } from '@/lib/utils';
import type { InsightsPendingAction } from '@/types/api';

export type ActionStatus = 'waiting' | 'running' | 'done' | 'cancelled' | 'failed' | 'expired';

const STATUS_TEXT: Partial<Record<ActionStatus, string>> = {
  done: 'Done',
  cancelled: 'Cancelled. Nothing was changed.',
  failed: "This didn't go through.",
  expired: 'This expired. Ask again if you still want it.',
};

/** The API keeps a proposed action for 10 minutes. */
export const isExpired = (expiresAt: string) => Date.parse(expiresAt) <= Date.now();

/** An action the assistant proposed. Only these buttons make it happen; the assistant can't. */
export function ActionCard({
  action,
  status,
  onConfirm,
  onCancel,
}: {
  action: InsightsPendingAction;
  status: ActionStatus;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  // Checked on render too, so an old card doesn't offer a button that can only fail.
  const shown: ActionStatus = status === 'waiting' && isExpired(action.expiresAt) ? 'expired' : status;
  const open = shown === 'waiting' || shown === 'running';

  return (
    <div
      role="group"
      aria-label="Action waiting for your confirmation"
      className={cn(
        'w-full max-w-md rounded-xl border px-4 py-3 space-y-3 text-sm',
        open ? 'border-primary/30 bg-primary/5' : 'border-border bg-surface',
      )}
    >
      <p className="text-foreground leading-relaxed">{action.summary}</p>
      {open ? (
        <div className="flex items-center gap-2">
          <button
            onClick={onConfirm}
            disabled={status === 'running'}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:opacity-50 transition"
          >
            {status === 'running' ? 'Working…' : action.confirmLabel}
          </button>
          <button
            onClick={onCancel}
            disabled={status === 'running'}
            className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:opacity-50 transition"
          >
            Cancel
          </button>
        </div>
      ) : (
        <p role="status" className={cn('text-xs', shown === 'done' ? 'text-success' : 'text-muted-foreground')}>
          {STATUS_TEXT[shown]}
        </p>
      )}
    </div>
  );
}
