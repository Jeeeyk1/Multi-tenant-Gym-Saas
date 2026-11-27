'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logOutOutline } from 'ionicons/icons';
import { Icon, cn } from '@gym-saas/ui';
import { adminLogout } from '@/lib/auth';
import { FitOpsMarkReversed, FitOpsWordmark, VerSolutionsLogo } from '@/components/brand/versolutions';
import { ADMIN_NAV, isActiveHref } from './nav-items';

/** Provider console navigation. The navy frame keeps it visibly separate from any gym's app. */
export function Sidebar({ email, onNavigate }: { email: string; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-[248px] flex-shrink-0 flex-col gap-[18px] bg-navy px-3.5 py-[18px] text-slate-light">
      <VerSolutionsLogo className="px-1.5 text-white" />

      <div className="flex min-h-[52px] items-center gap-2.5 rounded-xl border border-navy-line bg-navy-raised px-3 py-2">
        <FitOpsMarkReversed size={26} />
        <span className="flex flex-col">
          <span className="text-[11px] text-slate">Product</span>
          <FitOpsWordmark className="text-base text-white" />
        </span>
      </div>

      <nav aria-label="Main" className="flex flex-1 flex-col gap-0.5">
        {ADMIN_NAV.map((item) => {
          const active = isActiveHref(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex h-10 items-center gap-2.5 rounded-md px-3 text-sm transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky',
                active ? 'bg-navy-raised font-semibold text-white' : 'text-slate-light hover:bg-navy-raised/60 hover:text-white',
              )}
            >
              <Icon icon={item.icon} size={18} className={active ? 'text-sky' : 'text-slate'} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-navy-line pt-2.5">
        <p className="truncate px-1.5 text-[13px] font-semibold text-white">{email}</p>
        <p className="mb-2 px-1.5 text-xs text-slate-light">VerSolutions</p>
        <form action={adminLogout}>
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-slate-light transition-colors hover:bg-navy-raised/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky"
          >
            <Icon icon={logOutOutline} size={16} />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
