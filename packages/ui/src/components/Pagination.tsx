import type { ElementType } from 'react';
import { cn } from '../cn';

interface PaginationProps {
  page: number;
  pages: number;
  total: number;
  pageSize: number;
  /** Builds the URL for a page, keeping the current filters. */
  hrefFor: (page: number) => string;
  /** The app's router link (e.g. Next's Link) for client-side navigation. Defaults to <a>. */
  linkAs?: ElementType;
  /** e.g. "gyms": "21–40 of 45 gyms". */
  noun?: string;
  className?: string;
}

/** Page numbers with gaps around the current page: 1 … 4 5 6 … 12. */
function windowed(page: number, pages: number): (number | 'gap')[] {
  const wanted = new Set([1, pages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pages));
  const sorted = [...wanted].sort((a, b) => a - b);
  const out: (number | 'gap')[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('gap');
    out.push(p);
  });
  return out;
}

const ITEM =
  'inline-flex h-9 min-w-9 items-center justify-center rounded-md px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring';

/** "21–40 of 45" plus Previous / page numbers / Next, as links so pages are shareable and work without JS. */
export function Pagination({ page, pages, total, pageSize, hrefFor, linkAs, noun, className }: PaginationProps) {
  const Link = linkAs ?? 'a';
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <nav aria-label="Pagination" className={cn('flex flex-wrap items-center justify-between gap-3', className)}>
      <p className="tabular text-sm text-muted">
        {from}–{to} of {total.toLocaleString('en-US')}
        {noun ? ` ${noun}` : ''}
      </p>
      {pages > 1 ? (
        <div className="flex items-center gap-1">
          {page > 1 ? (
            <Link href={hrefFor(page - 1)} className={cn(ITEM, 'border border-border text-foreground hover:bg-hover')}>
              Previous
            </Link>
          ) : (
            <span className={cn(ITEM, 'border border-border text-disabled-foreground')} aria-disabled>
              Previous
            </span>
          )}
          {windowed(page, pages).map((p, i) =>
            p === 'gap' ? (
              <span key={`gap-${i}`} className="px-1 text-muted" aria-hidden>
                …
              </span>
            ) : (
              <Link
                key={p}
                href={hrefFor(p)}
                aria-label={`Page ${p}`}
                aria-current={p === page ? 'page' : undefined}
                className={cn(ITEM, 'hidden sm:inline-flex', p === page ? 'bg-nav-active font-semibold text-nav-active-foreground' : 'text-muted hover:bg-hover hover:text-foreground')}
              >
                {p}
              </Link>
            ),
          )}
          {page < pages ? (
            <Link href={hrefFor(page + 1)} className={cn(ITEM, 'border border-border text-foreground hover:bg-hover')}>
              Next
            </Link>
          ) : (
            <span className={cn(ITEM, 'border border-border text-disabled-foreground')} aria-disabled>
              Next
            </span>
          )}
        </div>
      ) : null}
    </nav>
  );
}
