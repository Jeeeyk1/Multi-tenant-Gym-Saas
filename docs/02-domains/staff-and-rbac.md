# Staff & RBAC Domain

## Purpose

This domain manages:

- staff assignment to gyms
- role-based access control (RBAC)
- permission enforcement across the system

It defines **who can do what** inside a gym.

Gyms are set up very differently: a solo owner who does everything, an owner with a front desk, staff who
also coach, gyms with no coach at all, and occasionally a full team. Roles are designed so every one of those
works: nothing assumes a role exists in a gym, and one person can hold several roles.

---

## Staff

A staff member is a user assigned to a gym (`gym_staff`). A user can be staff in several gyms with
different roles in each, and can also be a **member** of the same gym (see "Staff who are also members").

Staff are invited with `POST /gyms/:gymId/staff` (`staff.manage`, so Owner only). The invite can carry the
`role` (`OWNER`, `STAFF` or `TRAINER`), given in the same transaction. Only an owner can make someone an owner,
and nobody can change their own roles. Roles can also be added or removed later
(`POST/DELETE /gyms/:gymId/staff/:staffId/roles`). Invites and role changes are logged with who made them.

---

## Roles

Three predefined system roles (`roles`, `is_system_role = true`), mirrored by `StaffRole`
(`apps/api/src/common/enums/staff-role.enum.ts`) and migration `0051_roles_owner_staff_trainer`:

| | Owner | Staff | Trainer (app only) |
|---|---|---|---|
| Members: name and status | ✓ | ✓ | ✓ |
| Members: contact details, plan, prices, renewals (`members.details`) | ✓ | ✓ | — |
| Register, edit, renew, suspend members | ✓ | ✓ | — |
| Delete members | ✓ | — | — |
| Check-ins | ✓ | ✓ | ✓ |
| Announcements: post | ✓ | ✓ | — (can read) |
| Community chat moderation | ✓ | ✓ | ✓ |
| Leaderboard: submit and review PRs | ✓ | ✓ | ✓ |
| Leaderboard settings and lift ladders (`leaderboard.manage`) | ✓ | ✓ (owner can switch off) | — |
| Badges: award | ✓ | ✓ | ✓ |
| Badges: create custom badges (`badges.manage`) | ✓ | — | — |
| Plans (`plans.view`) | ✓ | ✓ | — |
| Reports, staff management, gym settings, billing, AI assistant | ✓ | — | — |

- **Several people can be Owner.** That's the answer for a manager who needs everything.
- **Roles combine.** Permissions are the union of a person's roles, so a staff member who also coaches can hold
  Staff + Trainer (Staff already covers the trainer's permissions).
- **Trainers** see members' name and status only: list and detail responses are reduced by
  `visibleMember()` (`modules/members/domain/member-visibility.ts`) without `members.details`. They use the app:
  the web dashboard is for people with Owner or Staff (`usesWebDashboard()` in `apps/web/src/lib/roles.ts`), and
  everyone else is sent to `/[code]/not-staff?as=trainer` (or `as=member`), both at sign-in and from the dashboard
  layout.
- **Web pages** are guarded by the same permission as their menu item (e.g. Settings needs `gym.settings`, Staff
  needs `staff.manage`; member pages need `members.view`, adding a member needs `members.create`), so typing a URL
  leads back to the dashboard instead of an empty page.
- The matrix lives in `db/seeds/003_role_permissions.sql` (fresh databases) and migration 0051 (existing ones).
  Change both together.

---

## Owner switches (per gym)

Because gyms are set up differently, the owner can switch selected permissions on or off for Staff or Trainer in
their own gym. A role's permissions in `role_permissions` stay the default; a row in
`gym_role_permission_overrides` changes one permission for one role in one gym.

- **Adjustable pairs are listed in code:** `ROLE_SETTINGS` in `apps/api/src/common/auth/role-settings.ts`. To make
  another permission adjustable, add a setting there; nothing else changes. Overrides for anything not on the list
  are ignored, and the Owner role is never overridden.
- **Today's setting:** `STAFF_MANAGES_LEADERBOARD` (Staff · `leaderboard.manage`, on by default). It covers the
  leaderboard lifts and the lift ladders.
- **API (Owner only, `gym.settings`):** `GET /gyms/:gymId/role-settings` and
  `PUT /gyms/:gymId/role-settings/:key { "enabled": bool }`. Switching back to the default deletes the row.
  Changes are logged (`role setting changed gym=… setting=… enabled=… by=…`).
- **Tokens apply overrides per role before the union** (`gymClaims()`), so switching Staff's leaderboard off
  doesn't affect someone who is also an Owner. It takes effect at each person's next token refresh, within the
  access-token lifetime (`JWT_ACCESS_EXPIRES_IN`, 15 minutes by default).

## Staff who are also members

A trainer who trains at the same gym has both a `gym_staff` and a `gym_members` row. Their gym token then has
their staff roles **plus** `MEMBER`, and the member permissions (`checkins.self`, `announcements.view`), so the
app can offer a member view. One function builds the token's roles and permissions for login and refresh:
`gymClaims()` in `modules/identity/domain/gym-claims.ts`. Someone who is neither staff nor a member can't sign in.

---

## Permissions

Permission keys are listed in the `Permission` enum (`common/enums/permission.enum.ts`), matching the
`permissions` table. They are embedded in the JWT at login and refresh, so **role changes apply at the next
token refresh or sign-in**.

Use cases check them with the shared helpers in `common/auth/authorization.ts`:

```ts
assertGymAccess(caller, gymId);
assertPermission(caller, Permission.MEMBERS_CREATE);
```

Never check role names for access (`roles.includes('STAFF')`). The exceptions are the owner-protection rules in
`modules/staff/domain/staff-management.rules.ts`, which are about the Owner role itself.

---

## Invariants

- Roles are predefined; gyms don't create custom roles.
- A user must be active in `gym_staff` (or a member) to act in a gym; permissions apply only to that gym.
- `gymId` comes from the authenticated context, never the request body.
- Only an owner grants, removes or acts on the Owner role. Nobody changes their own roles or deactivates themself.
- Org tokens (the organization owner) pass permission checks for gyms they own; `GymAccessGuard` scopes them.

## Edge cases

- **Staff with no roles:** no permissions, so protected endpoints refuse them.
- **Staff removed from a gym:** their next refresh fails unless they are also a member, who then gets a member token.
- **Role changed:** takes effect at the next token refresh.
