import type { ReactNode } from 'react';
import { cn } from '../cn';
import { Icon } from './Icon';

interface EmptyStateProps {
  /** An icon from `ionicons/icons`. */
  icon?: string;
  title: string;
  message?: ReactNode;
  /** Usually a <Button>: "Add the first member", or "Try again" for a failed load. */
  action?: ReactNode;
  /** error tints the icon so a failed load doesn't look like "nothing here yet". */
  tone?: 'neutral' | 'error';
  className?: string;
}

/** What a list or page shows when it has nothing, or when loading it failed. */
export function EmptyState({ icon, title, message, action, tone = 'neutral', className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center gap-2 px-6 py-10 text-center', className)} role={tone === 'error' ? 'alert' : undefined}>
      {icon ? (
        <span
          className={cn(
            'mb-1 flex h-12 w-12 items-center justify-center rounded-lg',
            tone === 'error' ? 'bg-destructive-bg text-destructive-text' : 'bg-hover text-icon-muted',
          )}
        >
          <Icon icon={icon} size={24} />
        </span>
      ) : null}
      <p className="font-heading text-body font-bold text-foreground">{title}</p>
      {message ? <p className="max-w-sm text-sm text-muted">{message}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
