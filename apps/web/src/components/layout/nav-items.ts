import {
  chatbubblesOutline,
  documentTextOutline,
  enterOutline,
  gridOutline,
  idCardOutline,
  medalOutline,
  megaphoneOutline,
  peopleOutline,
  refreshOutline,
  settingsOutline,
  sparklesOutline,
  trophyOutline,
  walletOutline,
} from 'ionicons/icons';

export interface NavItem {
  label: string;
  href: string;
  /** From `ionicons/icons`, the same set as the mobile app. */
  icon: string;
  permission?: string;
  /** Extra words for ⌘K search. */
  keywords?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/** Staff web navigation, grouped by what staff are doing. Items are filtered by permission. */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Today',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: gridOutline, keywords: 'home overview' },
      { label: 'Check-ins', href: '/dashboard/check-ins', icon: enterOutline, permission: 'checkins.manage', keywords: 'who is here' },
      { label: 'Members', href: '/dashboard/members', icon: peopleOutline, permission: 'members.view', keywords: 'people register' },
    ],
  },
  {
    label: 'Business',
    items: [
      { label: 'Plans', href: '/dashboard/plans', icon: documentTextOutline, permission: 'plans.view', keywords: 'membership pricing' },
      { label: 'Renewals', href: '/dashboard/renewals', icon: refreshOutline, permission: 'members.renew', keywords: 'expiring due' },
      { label: 'Billing', href: '/dashboard/billing', icon: walletOutline, permission: 'billing.manage', keywords: 'subscription invoice payment' },
    ],
  },
  {
    label: 'Community',
    items: [
      { label: 'Announcements', href: '/dashboard/announcements', icon: megaphoneOutline, permission: 'announcements.manage', keywords: 'news post' },
      { label: 'Chat', href: '/dashboard/chat', icon: chatbubblesOutline, permission: 'chat.manage', keywords: 'messages moderation' },
      { label: 'Leaderboard', href: '/dashboard/leaderboard', icon: trophyOutline, permission: 'leaderboard.view', keywords: 'prs lifts' },
      // Lift ladders (leaderboard.manage) live here; owners also create custom badges on this page.
      { label: 'Badges', href: '/dashboard/badges', icon: medalOutline, permission: 'leaderboard.manage', keywords: 'awards ladders' },
    ],
  },
  {
    label: 'Gym',
    items: [
      { label: 'AI Assistant', href: '/dashboard/insights', icon: sparklesOutline, permission: 'insights.query', keywords: 'ask insights' },
      { label: 'Staff', href: '/dashboard/staff', icon: idCardOutline, permission: 'staff.manage', keywords: 'team roles invite' },
      { label: 'Settings', href: '/dashboard/settings', icon: settingsOutline, permission: 'gym.settings', keywords: 'profile hours branding' },
    ],
  },
];

export function visibleNavGroups(permissions: string[]): NavGroup[] {
  return NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => !i.permission || permissions.includes(i.permission)),
  })).filter((g) => g.items.length > 0);
}

export function isActiveHref(pathname: string, href: string): boolean {
  return href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);
}
