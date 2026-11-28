'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { CommandPalette, cn, type CommandItem } from '@gym-saas/ui';
import { Sidebar, type SidebarProps } from './sidebar';
import { Topbar } from './topbar';
import { isActiveHref, visibleNavGroups } from './nav-items';
import { useTheme } from './use-theme';

const COLLAPSED_KEY = 'fitops.sidebar.collapsed';

interface AppShellProps extends Omit<SidebarProps, 'collapsed' | 'onNavigate'> {
  /** The page-wide primary action shown in the top bar. */
  action?: ReactNode;
  children: ReactNode;
}

/**
 * Staff web frame: collapsible sidebar (remembered per browser), a drawer on small screens,
 * a top bar, and ⌘K search over the pages the user can open.
 */
export function AppShell({ action, children, ...sidebar }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { dark, toggle } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSED_KEY) === '1');
    } catch {
      /* localStorage unavailable */
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSED_KEY, c ? '0' : '1');
      } catch {
        /* localStorage unavailable */
      }
      return !c;
    });
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!drawerOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setDrawerOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  // Close the drawer whenever the route changes.
  useEffect(() => setDrawerOpen(false), [pathname]);

  const groups = visibleNavGroups(sidebar.permissions);
  const title = groups.flatMap((g) => g.items).find((i) => isActiveHref(pathname, i.href))?.label ?? 'FitOps';

  const commands = useMemo<CommandItem[]>(
    () => [
      ...groups.flatMap((g) =>
        g.items.map((i) => ({
          id: i.href,
          label: i.label,
          group: 'Pages',
          icon: i.icon,
          keywords: `${g.label} ${i.keywords ?? ''}`,
          onSelect: () => router.push(i.href),
        })),
      ),
      { id: 'theme', label: dark ? 'Switch to light mode' : 'Switch to dark mode', group: 'Actions', keywords: 'theme appearance', onSelect: toggle },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sidebar.permissions, dark],
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <Sidebar {...sidebar} collapsed={collapsed} />
      </div>

      {/* Mobile drawer */}
      {/* `invisible` keeps the closed drawer out of the tab order; it switches only after the slide-out. */}
      <div className={cn('fixed inset-0 z-50 transition-[visibility] duration-gentle lg:hidden', drawerOpen ? 'visible' : 'invisible')}>
        <div
          className={cn('absolute inset-0 bg-scrim/50 transition-opacity duration-200', drawerOpen ? 'opacity-100' : 'opacity-0')}
          onClick={() => setDrawerOpen(false)}
        />
        <div
          className={cn(
            'absolute inset-y-0 left-0 shadow-1 transition-transform duration-gentle ease-gentle',
            drawerOpen ? 'translate-x-0' : '-translate-x-full',
          )}
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
        >
          <Sidebar {...sidebar} onNavigate={() => setDrawerOpen(false)} />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          title={title}
          collapsed={collapsed}
          onToggleCollapsed={toggleCollapsed}
          onOpenMenu={() => setDrawerOpen(true)}
          onOpenSearch={() => setSearchOpen(true)}
          action={action}
        />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>

      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} items={commands} />
    </div>
  );
}
