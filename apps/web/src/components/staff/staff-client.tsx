'use client';

import { useState } from 'react';
import { Dialog, TextField } from '@gym-saas/ui';
import { cn } from '@/lib/utils';
import { inviteStaff, deactivateStaff, assignRole, removeRole } from '@/lib/actions/staff';
import { StaffRole } from '@gym-saas/contracts';
import { ROLE_DESCRIPTION, ROLE_LABEL, roleLabel } from '@/lib/roles';
import type { StaffMember, GymRole } from '@/types/api';

const ROLE_COLORS: Record<string, string> = {
  OWNER: 'text-primary border-primary/40 bg-primary/10',
  STAFF: 'text-success border-success/40 bg-success-bg',
  TRAINER: 'text-warning border-warning/40 bg-warning-bg',
};

interface Props {
  gymId: string;
  staff: StaffMember[];
  roles: GymRole[];
  /** Only owners can make someone an owner. */
  canGrantOwner: boolean;
}

export function StaffClient({ gymId, staff, roles, canGrantOwner }: Props) {
  const grantable = canGrantOwner ? roles : roles.filter((r) => r.name !== StaffRole.OWNER);
  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {staff.filter((s) => s.isActive).length} active · {staff.filter((s) => !s.isActive).length} inactive
        </p>
        <button
          onClick={() => setInviteOpen(true)}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-sm py-2 font-semibold px-4 rounded-md hover:bg-primary-hover transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
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
              <StaffRow key={s.id} gymId={gymId} member={s} availableRoles={grantable} />
            ))}
          </ul>
        </div>
      )}

      {inviteOpen && (
        <InviteModal gymId={gymId} canGrantOwner={canGrantOwner} onClose={() => setInviteOpen(false)} />
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
              <span className="text-xs text-muted-foreground border border-border rounded-pill px-2 py-0.5 font-semibold">Inactive</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{member.user.email}</p>

          {/* Roles */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {member.roles.map((r) => (
              <span
                key={r.id}
                className={cn(
                  'inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-pill border',
                  ROLE_COLORS[r.role.name] ?? 'text-muted-foreground border-border',
                )}
              >
                {roleLabel(r.role.name)}
                {member.isActive && (
                  <button
                    type="button"
                    onClick={() => handleRemoveRole(r.role.id)}
                    disabled={removingRoleId === r.role.id}
                    aria-label={`Remove ${roleLabel(r.role.name)} role`}
                    aria-busy={removingRoleId === r.role.id || undefined}
                    className="ml-0.5 rounded-sm opacity-60 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring transition"
                  >
                    <span aria-hidden>{removingRoleId === r.role.id ? '…' : '×'}</span>
                  </button>
                )}
              </span>
            ))}
          </div>

          {/* Assign role row */}
          {member.isActive && unassignedRoles.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <select
                aria-label={`Assign a role to ${member.user.fullName}`}
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                className="text-xs bg-surface border border-border rounded-md px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-focus-ring focus:border-focus-ring"
              >
                <option value="">+ Assign role…</option>
                {unassignedRoles.map((r) => (
                  <option key={r.id} value={r.id}>{roleLabel(r.name)}</option>
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

          {error && <p role="alert" className="text-xs text-destructive-text mt-1">{error}</p>}
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

const INVITE_ROLES = [StaffRole.STAFF, StaffRole.TRAINER, StaffRole.OWNER];

function InviteModal({ gymId, canGrantOwner, onClose }: { gymId: string; canGrantOwner: boolean; onClose: () => void }) {
  const [role, setRole] = useState<StaffRole>(StaffRole.STAFF);
  const roleChoices = INVITE_ROLES.filter((r) => r !== StaffRole.OWNER || canGrantOwner);
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
    <Dialog open onClose={onClose} title="Invite to your team" size="sm" dismissible={!isPending}>
      {inviteToken ? (
        <div className="space-y-4">
          <p role="status" className="text-sm text-success font-medium">✓ Invitation created successfully!</p>
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
            className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-md hover:bg-primary-hover transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          >
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <TextField label="Full name" name="fullName" type="text" required placeholder="Jane Doe" disabled={isPending} />
          <TextField label="Email" name="email" type="email" required placeholder="jane@example.com" disabled={isPending} />
          <fieldset>
            <legend className="text-label text-foreground mb-1.5">Role</legend>
            <div className="space-y-2">
              {roleChoices.map((r) => (
                <label
                  key={r}
                  className={cn(
                    'flex gap-3 rounded-md border px-3 py-2.5 cursor-pointer transition focus-within:ring-2 focus-within:ring-focus-ring',
                    role === r ? 'border-primary bg-primary/10' : 'border-border hover:bg-hover',
                  )}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r}
                    checked={role === r}
                    onChange={() => setRole(r)}
                    disabled={isPending}
                    className="mt-1 accent-primary"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-foreground">{ROLE_LABEL[r]}</span>
                    <span className="block text-xs text-muted-foreground">{ROLE_DESCRIPTION[r]}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <TextField label="Phone" hint="Optional" name="phone" type="tel" placeholder="+63 912 345 6789" disabled={isPending} />
          {error && (
            <div role="alert" className="bg-destructive-bg border border-destructive rounded-md px-3 py-2">
              <p className="text-sm text-destructive-text">{error}</p>
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={isPending}
              className="bg-surface flex-1 px-4 py-2.5 text-sm rounded-md border border-border text-foreground hover:text-foreground transition disabled:opacity-50 font-semibold hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring">
              Cancel
            </button>
            <button type="submit" disabled={isPending}
              className="flex-1 bg-primary text-primary-foreground font-semibold py-2.5 rounded-md hover:bg-primary-hover transition disabled:bg-disabled disabled:text-disabled-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring">
              {isPending ? 'Inviting…' : 'Send Invite'}
            </button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
