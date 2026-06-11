'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { MemberListItem } from '@/types/api';

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'text-success border-success/40 bg-success/10',
  EXPIRED: 'text-destructive border-destructive/40 bg-destructive/10',
  SUSPENDED: 'text-warning border-warning/40 bg-warning/10',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full border', STATUS_STYLES[status] ?? 'text-muted-foreground border-border')}>
      {status}
    </span>
  );
}

interface Props {
  members: MemberListItem[];
}

export function MembersTable({ members }: Props) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.user.fullName.toLowerCase().includes(q) ||
        m.user.email.toLowerCase().includes(q) ||
        m.membershipNumber.toLowerCase().includes(q),
    );
  }, [members, search]);

  return (
    <div className="space-y-4">
      <input
        type="text"
        placeholder="Search name, email, or membership #…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-sm bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
      />

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {/* Table header */}
        <div className="hidden md:grid grid-cols-[1fr_1fr_auto_auto_auto_auto] gap-4 px-5 py-3 border-b border-border">
          {['Member', 'Email', 'Plan', 'Status', 'Expiry', ''].map((h) => (
            <p key={h} className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {h}
            </p>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {search.trim() ? 'No members match your search.' : 'No members found.'}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((m) => (
              <li key={m.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto_auto_auto_auto] gap-2 md:gap-4 items-center px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{m.user.fullName}</p>
                  <p className="text-xs text-muted-foreground font-mono">{m.membershipNumber}</p>
                </div>
                <p className="text-sm text-muted-foreground truncate">{m.user.email}</p>
                <p className="text-sm text-muted-foreground">{m.membershipPlan?.name ?? '—'}</p>
                <StatusBadge status={m.status} />
                <p className="text-sm text-muted-foreground whitespace-nowrap">
                  {new Date(m.expiryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
                <Link
                  href={`/dashboard/members/${m.id}`}
                  className="text-xs font-medium text-primary hover:underline whitespace-nowrap"
                >
                  View →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
