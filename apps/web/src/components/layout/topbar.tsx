'use client';

import type { ReactNode } from 'react';
import { chevronBackOutline, menuOutline, searchOutline } from 'ionicons/icons';
import { Icon, cn } from '@gym-saas/ui';

interface TopbarProps {
  /** Current page name, shown on small screens where the sidebar is hidden. */
  title: string;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onOpenMenu: () => void;
  onOpenSearch: () => void;
  /** The page-wide primary action, e.g. "Check in member". */
  action?: ReactNode;
}

const ICON_BUTTON =
  'flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring';

export function Topbar({ title, collapsed, onToggleCollapsed, onOpenMenu, onOpenSearch, action }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-surface/75">
      <button type="button" onClick={onOpenMenu} className={cn(ICON_BUTTON, 'lg:hidden')} aria-label="Open menu">
        <Icon icon={menuOutline} size={18} />
      </button>
      <button
        type="button"
        onClick={onToggleCollapsed}
        className={cn(ICON_BUTTON, 'hidden lg:flex')}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-pressed={collapsed}
      >
        <Icon icon={chevronBackOutline} size={16} className={cn('transition-transform duration-gentle ease-gentle', collapsed && 'rotate-180')} />
      </button>
      <p className="truncate font-heading text-body font-bold text-foreground lg:hidden">{title}</p>

      <button
        type="button"
        onClick={onOpenSearch}
        className="ml-auto flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring sm:w-72"
        aria-label="Search pages and actions"
        aria-keyshortcuts="Meta+K Control+K"
      >
        <Icon icon={searchOutline} size={16} />
        <span className="hidden sm:inline">Search pages and actions</span>
        <kbd className="ml-auto hidden rounded-sm border border-border bg-surface px-1.5 font-mono text-[11px] sm:inline">⌘K</kbd>
      </button>
      {action}
    </header>
  );
}
