import type { ReactNode } from 'react';
import { cn } from '../cn';

interface PageHeaderProps {
  title: string;
  /** Small line above the title, e.g. the product or a parent page. */
  eyebrow?: string;
  description?: ReactNode;
  /** Buttons on the right, e.g. "Invite gym client". */
  actions?: ReactNode;
  className?: string;
}

/** The same page title block on every staff and admin page. */
export function PageHeader({ title, eyebrow, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        {eyebrow ? <p className="text-sm text-muted">{eyebrow}</p> : null}
        <h1 className="font-heading text-heading text-foreground">{title}</h1>
        {description ? <div className="mt-1 text-sm text-muted">{description}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
