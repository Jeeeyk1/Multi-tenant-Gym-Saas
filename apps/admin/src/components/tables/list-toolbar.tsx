'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { searchOutline } from 'ionicons/icons';
import { Icon, SegmentedControl, Spinner } from '@gym-saas/ui';

interface ListToolbarProps {
  searchLabel: string;
  /** Status filter; the first option should be "All" with value "". */
  statuses?: { value: string; label: string }[];
}

const DEBOUNCE_MS = 300;

/**
 * Search box and status filter for an admin list. State lives in the URL (?search=&status=),
 * so filtered lists are shareable and the server page does the querying. Changing a filter goes back to page 1.
 */
export function ListToolbar({ searchLabel, statuses }: ListToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(params.get('search') ?? '');
  const first = useRef(true);

  function apply(changes: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    next.delete('page');
    const qs = next.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => apply({ search: search.trim() }), DEBOUNCE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="flex h-control w-full items-center gap-2 rounded-md border border-border bg-surface px-3 focus-within:ring-2 focus-within:ring-focus-ring sm:w-80">
        <span className="sr-only">{searchLabel}</span>
        <Icon icon={searchOutline} size={16} className="text-icon-muted" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={searchLabel}
          className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
        />
        {pending ? <Spinner className="text-muted" label="Updating results" /> : null}
      </label>
      {statuses ? (
        <SegmentedControl
          label="Status filter"
          options={statuses}
          value={params.get('status') ?? ''}
          onChange={(status) => apply({ status })}
        />
      ) : null}
    </div>
  );
}
