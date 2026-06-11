'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { inviteStaff, deactivateStaff, assignRole, removeRole } from '@/lib/actions/staff';
import type { StaffMember, GymRole } from '@/types/api';

const ROLE_COLORS: Record<string, string> = {
  MANAGER: 'text-primary border-primary/40 bg-primary/10',
  FRONT_DESK: 'text-success border-success/40 bg-success/10',
  TRAINER: 'text-warning border-warning/40 bg-warning/10',
};

interface Props {
  gymId: string;
  staff: StaffMember[];
  roles: GymRole[];
}

export function StaffClient({ gymId, staff, roles }: Props) {
  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {staff.filter((s) => s.isActive).length} active · {staff.filter((s) => !s.isActive).length} inactive
        </p>
        <button
          onClick={() => setInviteOpen(true)}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition"
        >
          <span className="text-base leading-none">+</span>
          Invite Staff
        </button>
      </div>

      {staff.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-12 text-center">
          <p className="text-sm text-muted-foreground">No staff members yet. Invite someone to get started.</p>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <ul className="divide-y divide-border">
            {staff.map((s) => (
              <StaffRow key={s.id} gymId={gymId} member={s} availableRoles={roles} />
            ))}
          </ul>
        </div>
      )}

      {inviteOpen && (
        <InviteModal gymId={gymId} onClose={() => setInviteOpen(false)} />
      )}
    </>
  );
}

function StaffRow({
  gymId,
  member,
  availableRoles,
}: {
  gymId: string;
  member: StaffMember;
  availableRoles: GymRole[];
}) {
  const [assigning, setAssigning] = useState(false);
  const [removingRoleId, setRemovingRoleId] = useState<string | null>(null);
  const [deactivating, setDeactivating] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const assignedRoleIds = new Set(member.roles.map((r) => r.role.id));
  const unassignedRoles = availableRoles.filter((r) => !assignedRoleIds.has(r.id));

  async function handleAssignRole() {
    if (!selectedRoleId) return;
    setAssigning(true);
    setError(null);
    try {
      const result = await assignRole(gymId, member.id, selectedRoleId);
      if (result.error) setError(result.error);
      else setSelectedRoleId('');
    } finally {
      setAssigning(false);
    }
  }

  async function handleRemoveRole(roleId: string) {
    setRemovingRoleId(roleId);
    setError(null);
    try {
      const result = await removeRole(gymId, member.id, roleId);
      if (result.error) setError(result.error);
    } finally {
      setRemovingRoleId(null);
    }
  }

  async function handleDeactivate() {
    if (!confirm(`Deactivate ${member.user.fullName}? They will lose access to the gym.`)) return;
    setDeactivating(true);
    try {
      const result = await deactivateStaff(gymId, member.id);
      if (result.error) setError(result.error);
    } finally {
      setDeactivating(false);
    }
  }

  return (
    <li className="px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{member.user.fullName}</p>
            {!member.isActive && (
              <span className="text-xs text-muted-foreground border border-border rounded-full px-2 py-0.5">Inactive</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{member.user.email}</p>

          {/* Roles */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {member.roles.map((r) => (
              <span
                key={r.id}
                className={cn(
                  'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border',
                  ROLE_COLORS[r.role.name] ?? 'text-muted-foreground border-border',
                )}
              >
                {r.role.name}
                {member.isActive && (
                  <button
                    onClick={() => handleRemoveRole(r.role.id)}
                    disabled={removingRoleId === r.role.id}
                    className="ml-0.5 opacity-60 hover:opacity-100 transition"
                  >
                    {removingRoleId === r.role.id ? '…' : '×'}
                  </button>
                )}
              </span>
            ))}
          </div>

          {/* Assign role row */}
          {member.isActive && unassignedRoles.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <select
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                className="text-xs bg-background border border-border rounded-md px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              >
                <option value="">+ Assign role…</option>
                {unassignedRoles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              {selectedRoleId && (
                <button
                  onClick={handleAssignRole}
                  disabled={assigning}
                  className="text-xs text-primary hover:underline disabled:opacity-50"
                >
                  {assigning ? 'Assigning…' : 'Assign'}
                </button>
              )}
            </div>
          )}

          {error && <p className="text-xs text-destructive mt-1">{error}</p>}
        </div>

        {/* Deactivate */}
        {member.isActive && (
          <button
            onClick={handleDeactivate}
            disabled={deactivating}
            className="text-xs font-medium px-3 py-1.5 rounded-md border border-warning/40 text-warning hover:bg-warning/10 transition disabled:opacity-40 shrink-0"
          >
            {deactivating ? '…' : 'Deactivate'}
          </button>
        )}
      </div>
    </li>
  );
}

function InviteModal({ gymId, onClose }: { gymId: string; onClose: () => void }) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      const fd = new FormData(e.currentTarget);
      const result = await inviteStaff(gymId, {}, fd);
      if (result.error) setError(result.error);
      else if (result.inviteToken) setInviteToken(result.inviteToken);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-surface border border-border rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-foreground">Invite Staff Member</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition text-lg px-1">✕</button>
        </div>

        {inviteToken ? (
          <div className="space-y-4">
            <p className="text-sm text-success font-medium">✓ Invitation created successfully!</p>
            <div>
              <p className="text-xs text-muted-foreground mb-1.5 uppercase tracking-wide font-medium">Activation Token</p>
              <p className="text-xs font-mono bg-background border border-border rounded-lg px-3 py-2 break-all text-foreground">
                {inviteToken}
              </p>
              <p className="text-xs text-muted-foreground mt-1.5">
                Share this token with the staff member to activate their account.
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg hover:opacity-90 transition"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                Full Name <span className="text-destructive">*</span>
              </label>
              <input name="fullName" type="text" required placeholder="Jane Doe" disabled={isPending}
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                Email <span className="text-destructive">*</span>
              </label>
              <input name="email" type="email" required placeholder="jane@example.com" disabled={isPending}
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                Phone <span className="text-muted-foreground font-normal normal-case">(optional)</span>
              </label>
              <input name="phone" type="tel" placeholder="+63 912 345 6789" disabled={isPending}
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition" />
            </div>
            {error && (
              <div className="bg-red-950/60 border border-destructive rounded-lg px-3 py-2">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} disabled={isPending}
                className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition disabled:opacity-50">
                Cancel
              </button>
              <button type="submit" disabled={isPending}
                className="flex-1 bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg hover:opacity-90 transition disabled:opacity-50">
                {isPending ? 'Inviting…' : 'Send Invite'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
