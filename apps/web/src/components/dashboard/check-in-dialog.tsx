'use client';

import { addOutline } from 'ionicons/icons';
import { Dialog, Icon, buttonClasses } from '@gym-saas/ui';
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
        className={buttonClasses('primary', 'sm')}
        aria-label="Check in member"
      >
        <Icon icon={addOutline} size={18} />
        <span className="hidden sm:inline">Check in member</span>
      </button>

      <Dialog open={open} onClose={handleClose} title="Check In Member">
        <input
          type="text"
          aria-label="Search members"
          placeholder="Search name, membership # or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-surface py-2 text-sm border border-border rounded-md px-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-focus-ring focus:border-focus-ring transition"
        />

        {error && (
          <div role="alert" className="px-3 py-2 bg-destructive-bg border border-destructive rounded-md">
            <p className="text-xs text-destructive-text">{error}</p>
          </div>
        )}

        {/* Member list */}
        <div className="-mx-3 max-h-[50vh] overflow-y-auto">
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
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition hover:bg-hover disabled:opacity-60',
                    isSuccess && 'bg-success-bg',
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
                          'text-xs font-semibold px-2 py-0.5 rounded-pill border',
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
      </Dialog>
    </>
  );
}
