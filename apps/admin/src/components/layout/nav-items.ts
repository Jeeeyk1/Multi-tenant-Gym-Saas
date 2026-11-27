import {
  businessOutline,
  cardOutline,
  gridOutline,
  paperPlaneOutline,
  peopleOutline,
  pricetagsOutline,
  receiptOutline,
} from 'ionicons/icons';

export interface AdminNavItem {
  label: string;
  href: string;
  /** From `ionicons/icons`, the same set as the gym apps. */
  icon: string;
  /** Extra words for ⌘K search. */
  keywords?: string;
}

export const ADMIN_NAV: AdminNavItem[] = [
  { label: 'Overview', href: '/dashboard', icon: gridOutline, keywords: 'home mrr revenue' },
  { label: 'Gyms', href: '/dashboard/gyms', icon: businessOutline, keywords: 'clients tenants' },
  { label: 'Leads', href: '/dashboard/leads', icon: paperPlaneOutline, keywords: 'signup requests' },
  { label: 'Payments', href: '/dashboard/payments', icon: cardOutline, keywords: 'verify references' },
  { label: 'Invoices', href: '/dashboard/invoices', icon: receiptOutline, keywords: 'billing' },
  { label: 'Users', href: '/dashboard/users', icon: peopleOutline, keywords: 'accounts members staff' },
  { label: 'Plans', href: '/dashboard/plans', icon: pricetagsOutline, keywords: 'pricing tiers ai caps' },
];

export function isActiveHref(pathname: string, href: string): boolean {
  return href === '/dashboard' ? pathname === href : pathname.startsWith(href);
}
