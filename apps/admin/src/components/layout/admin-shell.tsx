'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { menuOutline, searchOutline } from 'ionicons/icons';
import { CommandPalette, ConfirmProvider, Icon, ToastProvider, cn, type CommandItem } from '@gym-saas/ui';
import { Sidebar } from './sidebar';
import { ADMIN_NAV, isActiveHref } from './nav-items';

/**
 * Provider console frame: internal bar, navy sidebar (a drawer below `lg`), a top bar with ⌘K
 * search, and the kit's toast and confirm providers for every admin page.
 */
/** `banner` is the server-rendered internal bar (it reads a server-only env var, so it can't render here). */
export function AdminShell({ email, banner, children }: { email: string; banner: ReactNode; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

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

  useEffect(() => setDrawerOpen(false), [pathname]);

  const title = ADMIN_NAV.find((i) => isActiveHref(pathname, i.href))?.label ?? 'Console';
  const commands = useMemo<CommandItem[]>(
    () => [
      ...ADMIN_NAV.map((i) => ({ id: i.href, label: i.label, group: 'Pages', icon: i.icon, keywords: i.keywords, onSelect: () => router.push(i.href) })),
      { id: 'new-gym', label: 'Invite a gym client', group: 'Actions', keywords: 'new create onboard', onSelect: () => router.push('/dashboard/gyms/new') },
    ],
    [router],
  );

  return (
    <ToastProvider>
      <ConfirmProvider>
        <div className="flex h-screen flex-col overflow-hidden bg-background">
          {banner}
          <div className="flex min-h-0 flex-1">
            <div className="hidden lg:flex">
              <Sidebar email={email} />
            </div>

            {/* Drawer below lg. `invisible` keeps it out of the tab order once it has slid away. */}
            <div className={cn('fixed inset-0 z-50 transition-[visibility] duration-gentle lg:hidden', drawerOpen ? 'visible' : 'invisible')}>
              <div
                className={cn('absolute inset-0 bg-scrim/50 transition-opacity duration-200', drawerOpen ? 'opacity-100' : 'opacity-0')}
                onClick={() => setDrawerOpen(false)}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Menu"
                className={cn('absolute inset-y-0 left-0 transition-transform duration-gentle ease-gentle', drawerOpen ? 'translate-x-0' : '-translate-x-full')}
              >
                <Sidebar email={email} onNavigate={() => setDrawerOpen(false)} />
              </div>
            </div>

            <div className="flex min-w-0 flex-1 flex-col">
              <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-4">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(true)}
                  aria-label="Open menu"
                  className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted transition-colors hover:bg-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring lg:hidden"
                >
                  <Icon icon={menuOutline} size={18} />
                </button>
                <p className="truncate font-heading text-body font-bold text-foreground lg:hidden">{title}</p>
                <button
                  type="button"
                  onClick={() => setSearchOpen(true)}
                  aria-label="Search pages and actions"
                  aria-keyshortcuts="Meta+K Control+K"
                  className="ml-auto flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring sm:w-72"
                >
                  <Icon icon={searchOutline} size={16} />
                  <span className="hidden sm:inline">Search pages and actions</span>
                  <kbd className="ml-auto hidden rounded-sm border border-border bg-surface px-1.5 font-mono text-[11px] sm:inline">⌘K</kbd>
                </button>
              </header>
              <main className="flex-1 overflow-y-auto">{children}</main>
            </div>
          </div>
        </div>
        <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} items={commands} />
      </ConfirmProvider>
    </ToastProvider>
  );
}
