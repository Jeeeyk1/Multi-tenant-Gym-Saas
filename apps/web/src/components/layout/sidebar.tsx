'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { logout } from '@/lib/auth';

interface NavItem {
  label: string;
  href: string;
  icon: string;
  permission?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: '⬡' },
  { label: 'Check-ins', href: '/dashboard/check-ins', icon: '✓', permission: 'checkins.manage' },
  { label: 'Members', href: '/dashboard/members', icon: '◎', permission: 'members.view' },
  { label: 'Plans', href: '/dashboard/plans', icon: '◈', permission: 'plans.view' },
  { label: 'Renewals', href: '/dashboard/renewals', icon: '↻', permission: 'members.manage' },
  { label: 'Announcements', href: '/dashboard/announcements', icon: '◇', permission: 'announcements.manage' },
  { label: 'Chat', href: '/dashboard/chat', icon: '◉', permission: 'chat.manage' },
  { label: 'Staff', href: '/dashboard/staff', icon: '◈', permission: 'staff.manage' },
];

interface SidebarProps {
  permissions: string[];
  userName: string;
  gymName?: string;
  gymCode?: string;
}

export function Sidebar({ permissions, userName, gymName, gymCode }: SidebarProps) {
  const pathname = usePathname();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.permission || permissions.includes(item.permission),
  );

  return (
    <aside className="flex flex-col h-full w-60 bg-surface border-r border-border">
      {/* Gym identity */}
      <div className="px-4 py-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center text-sm">
            🐔
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {gymName ?? 'GainzOS'}
            </p>
            {gymCode && (
              <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">
                {gymCode}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {visibleItems.map((item) => {
          const isActive =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition',
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5',
              )}
            >
              <span className="text-base leading-none w-4 text-center">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm text-foreground font-medium truncate">{userName}</p>
            <p className="text-xs text-muted-foreground">Staff</p>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="text-xs text-muted-foreground hover:text-destructive transition px-2 py-1 rounded"
              title="Sign out"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
