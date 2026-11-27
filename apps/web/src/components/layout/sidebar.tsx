'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLayoutEffect, useRef, useState } from 'react';
import { logOutOutline, moonOutline, sunnyOutline } from 'ionicons/icons';
import { Icon, cn } from '@gym-saas/ui';
import { logout } from '@/lib/auth';
import { normalizeHex, onAccent } from '@/lib/accent';
import { FitOpsLockup, FitOpsMark } from '@/components/brand/fitops-mark';
import { isActiveHref, visibleNavGroups } from './nav-items';
import { useTheme } from './use-theme';

export interface SidebarProps {
  permissions: string[];
  userName: string;
  roleLabel?: string;
  gymName?: string;
  gymCode?: string;
  gymLocation?: string | null;
  gymColor?: string | null;
  logoUrl?: string | null;
  /** Icons only (desktop). Ignored inside the mobile drawer. */
  collapsed?: boolean;
  /** Called after a link is followed, so the mobile drawer can close. */
  onNavigate?: () => void;
}

export function Sidebar({
  permissions,
  userName,
  roleLabel,
  gymName,
  gymCode,
  gymLocation,
  gymColor,
  logoUrl,
  collapsed = false,
  onNavigate,
}: SidebarProps) {
  const pathname = usePathname();
  const { dark, toggle } = useTheme();
  const groups = visibleNavGroups(permissions);
  const badgeColor = logoUrl ? null : normalizeHex(gymColor);

  // A bar that glides to the active link (bouncy spring), measured from the link's position.
  const navRef = useRef<HTMLElement>(null);
  const [bar, setBar] = useState<{ top: number; height: number } | null>(null);
  useLayoutEffect(() => {
    const active = navRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
    setBar(active ? { top: active.offsetTop, height: active.offsetHeight } : null);
  }, [pathname, collapsed, permissions]);

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-border bg-surface transition-[width] duration-gentle ease-gentle',
        collapsed ? 'w-[72px]' : 'w-64',
      )}
    >
      {/* Gym identity: the gym's colour appears only here (brand rule) */}
      <div className={cn('flex items-center gap-3 border-b border-border py-4', collapsed ? 'justify-center px-2' : 'px-4')}>
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-background"
          style={badgeColor ? { backgroundColor: badgeColor, borderColor: badgeColor, color: onAccent(badgeColor) } : undefined}
          title={collapsed ? gymName : undefined}
        >
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={gymName ?? 'Gym logo'} className="h-full w-full object-cover" />
          ) : (
            <span className={cn('text-sm font-bold', !badgeColor && 'text-muted-foreground')}>
              {gymName ? gymName[0].toUpperCase() : '?'}
            </span>
          )}
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{gymName ?? '—'}</p>
            {gymLocation ? (
              <p className="truncate text-xs text-muted-foreground">{gymLocation}</p>
            ) : gymCode ? (
              <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{gymCode}</p>
            ) : null}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav ref={navRef} aria-label="Main" className="relative flex-1 overflow-y-auto px-3 py-3">
        {bar && (
          <span
            aria-hidden
            className="absolute left-1 w-[3px] rounded-full bg-nav-active-foreground transition-[top,height] duration-bouncy ease-bouncy"
            style={{ top: bar.top + 8, height: bar.height - 16 }}
          />
        )}
        {groups.map((group, gi) => (
          <div key={group.label} className={cn(gi > 0 && 'mt-4')}>
            {collapsed ? (
              gi > 0 && <div className="mx-3 mb-3 border-t border-border" aria-hidden />
            ) : (
              <p className="px-3 pb-1.5 text-eyebrow uppercase text-muted">{group.label}</p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActiveHref(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? 'page' : undefined}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        'flex h-nav-item items-center gap-3 rounded-md text-sm transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring',
                        collapsed ? 'justify-center px-0' : 'px-3',
                        active
                          ? 'bg-nav-active font-semibold text-nav-active-foreground'
                          : 'text-muted-foreground hover:bg-hover hover:text-foreground',
                      )}
                    >
                      <Icon icon={item.icon} size={18} />
                      {collapsed ? <span className="sr-only">{item.label}</span> : item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Account */}
      <div className={cn('space-y-1 border-t border-border py-3', collapsed ? 'px-2' : 'px-3')}>
        {!collapsed && (
          <div className="px-2 pb-1">
            <p className="truncate text-sm font-medium text-foreground">{userName}</p>
            <p className="text-xs text-muted-foreground">{roleLabel ?? 'Staff'}</p>
          </div>
        )}
        <button
          type="button"
          onClick={toggle}
          title={collapsed ? (dark ? 'Light mode' : 'Dark mode') : undefined}
          className={cn(
            'flex h-9 w-full items-center gap-3 rounded-md text-sm text-muted-foreground transition-colors hover:bg-hover hover:text-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring',
            collapsed ? 'justify-center' : 'px-2',
          )}
        >
          <Icon icon={dark ? sunnyOutline : moonOutline} size={18} />
          {collapsed ? <span className="sr-only">{dark ? 'Light mode' : 'Dark mode'}</span> : dark ? 'Light mode' : 'Dark mode'}
        </button>
        <form action={logout}>
          <button
            type="submit"
            title={collapsed ? 'Sign out' : undefined}
            className={cn(
              'flex h-9 w-full items-center gap-3 rounded-md text-sm text-muted-foreground transition-colors hover:bg-destructive-bg hover:text-destructive-text',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring',
              collapsed ? 'justify-center' : 'px-2',
            )}
          >
            <Icon icon={logOutOutline} size={18} />
            {collapsed ? <span className="sr-only">Sign out</span> : 'Sign out'}
          </button>
        </form>
        <div className={cn('pt-2', collapsed ? 'flex justify-center' : 'px-2')}>
          {collapsed ? <FitOpsMark size={18} /> : <FitOpsLockup size={14} />}
        </div>
      </div>
    </aside>
  );
}
