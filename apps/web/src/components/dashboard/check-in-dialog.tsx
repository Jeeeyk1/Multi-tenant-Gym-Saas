'use client';

import { useState, useMemo } from 'react';
import { loadMembers, checkInMember } from '@/lib/actions/checkins';
import { cn } from '@/lib/utils';
import type { MemberListItem } from '@/types/api';

const STATUS_CLASS: Record<string, string> = {
  ACTIVE: 'text-success border-success/50',
  EXPIRED: 'text-destructive border-destructive/50',
  SUSPENDED: 'text-warning border-warning/50',
};

function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

interface Props {
  gymId: string;
}

export function CheckInDialog({ gymId }: Props) {
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<MemberListItem[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [search, setSearch] = useState('');
  const [checkingInId, setCheckingInId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  async function handleOpen() {
    setOpen(true);
    setError(null);
    setSearch('');
    setSuccessId(null);
    if (members.length === 0) {
      setLoadingMembers(true);
      try {
        const data = await loadMembers(gymId);
        setMembers(data);
      } finally {
        setLoadingMembers(false);
      }
    }
  }

  function handleClose() {
    setOpen(false);
    setError(null);
    setSuccessId(null);
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return members;
    const q = search.toLowerCase();
    return members.filter(
      (m) =>
        m.user.fullName.toLowerCase().includes(q) ||
        m.membershipNumber.toLowerCase().includes(q) ||
        m.user.email.toLowerCase().includes(q),
    );
  }, [members, search]);

  async function handleCheckIn(member: MemberListItem) {
    if (member.status !== 'ACTIVE') {
      setError(`Cannot check in: member status is ${member.status}`);
      return;
    }
    setCheckingInId(member.id);
    setError(null);
    try {
      const result = await checkInMember(gymId, member.id);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccessId(member.id);
        setTimeout(handleClose, 900);
      }
    } finally {
      setCheckingInId(null);
    }
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition"
      >
        <span className="text-base leading-none">+</span>
        Check In Member
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Sheet */}
          <div className="relative w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl flex flex-col max-h-[80vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border">
              <h2 className="text-base font-semibold text-foreground">Check In Member</h2>
              <button
                onClick={handleClose}
                className="text-muted-foreground hover:text-foreground transition text-lg leading-none px-1"
              >
                ✕
              </button>
            </div>

            {/* Search */}
            <div className="px-4 py-3 border-b border-border">
              <input
                type="text"
                placeholder="Search name, membership # or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="mx-4 mt-3 px-3 py-2 bg-red-950/60 border border-destructive rounded-lg">
                <p className="text-xs text-destructive">{error}</p>
              </div>
            )}

            {/* Member list */}
            <div className="flex-1 overflow-y-auto px-2 py-2">
              {loadingMembers ? (
                <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
              ) : filtered.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  {search.trim() ? 'No members match your search' : 'No members found'}
                </div>
              ) : (
                filtered.map((member) => {
                  const isChecking = checkingInId === member.id;
                  const isSuccess = successId === member.id;
                  const statusClass = STATUS_CLASS[member.status] ?? 'text-muted-foreground';
                  return (
                    <button
                      key={member.id}
                      onClick={() => handleCheckIn(member)}
                      disabled={isChecking || !!successId}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition hover:bg-white/5 disabled:opacity-60',
                        isSuccess && 'bg-success/10',
                      )}
                    >
                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-full bg-background border border-border flex items-center justify-center shrink-0">
                        <span className="text-xs font-semibold text-primary">
                          {getInitials(member.user.fullName)}
                        </span>
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {member.user.fullName}
                        </p>
                        <p className="text-xs text-muted-foreground">{member.membershipNumber}</p>
                      </div>
                      {/* Status or action indicator */}
                      <div className="shrink-0">
                        {isChecking ? (
                          <span className="text-xs text-muted-foreground">…</span>
                        ) : isSuccess ? (
                          <span className="text-xs text-success font-medium">✓ Done</span>
                        ) : (
                          <span
                            className={cn(
                              'text-xs font-medium px-2 py-0.5 rounded-full border',
                              statusClass,
                            )}
                          >
                            {member.status}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
