# Members Domain

## Purpose

The Members domain manages:

- gym membership enrollment
- membership lifecycle (active, expired, suspended)
- membership plans and pricing
- renewals
- member identity within a gym

This domain directly affects:
- access control
- check-ins
- revenue tracking

---

## Core entities

### GymMember

Represents a user's membership in a specific gym.

Key fields:

- id
- gym_id
- user_id
- membership_plan_id
- membership_number (globally unique)
- qr_code_token (globally unique)
- status
- expiry_date
- joined_at

---

### MembershipPlan

Defines pricing and duration.

Key fields:

- id
- gym_id
- name
- price
- duration_days
- is_active

Note:
- plan selection includes staff-applied pricing (promo, student, etc.)
- promo system is handled operationally (not via plan_promos table in MVP)

---

### MembershipRenewal

Audit record of renewals.

Key fields:

- id
- member_id
- previous_expiry
- new_expiry
- amount_paid
- renewed_by
- renewed_at

---

## Relationships

- one user → many gym memberships (across different gyms)
- one gym → many members
- one membership → one plan
- one membership → many renewals

Constraint:

```text
UNIQUE(gym_id, user_id)
```

---

## Membership status rules

| Status | Can login | Can check in | Can use features | Notes |
|---|---|---|---|---|
| ACTIVE | ✅ | ✅ | ✅ | Full access |
| EXPIRED | ✅ | ❌ | ❌ | Login only, no gym features |
| SUSPENDED | ✅ | ❌ | ❌ | Gym-scoped block, login unaffected |
| DELETED | — | ❌ | ❌ | The member deleted their account. The row now belongs to a "Deleted member" placeholder, kept for the gym's records. Staff can read its history but not change it (`MEMBER_DELETED`) |

**Suspension is gym-scoped.**
A member suspended at one gym can still log in and access other gyms they belong to.
Suspension only blocks access within the gym where it was applied.

`users.is_active = false` is the only platform-level login block. It is set by SUPER_ADMIN, or when a person deletes
their account (below), never by gym staff.

## Deleting an account (member-initiated)
Required by the App Store and Play. `POST /gyms/:gymId/members/me/delete-account` with the member's password.
The account is anonymised rather than removed, so the gym's records still add up:
- **Deleted:** profile and health data, weight and food logs, fitness, workout and meal plans, workout sessions, PR
  submissions, badges, bulk-invite rows with their email, and their photos in storage (best effort after the delete;
  only files in their own upload folders, and PR photos no other submission uses).
- **Kept without a name:** renewals and check-ins. The membership row is moved to a placeholder "Deleted member" user,
  gets status `DELETED`, a new QR token, and drops out of the member list and the assistant's `find_member`.
- **Chat in this gym:** their message text is cleared and their chat memberships, reactions and reads here are removed,
  and their open chat sockets for this gym are closed. Not if they are staff at this gym: they chat under the same
  login as staff, so that stays.
- **The login:** if the person has no other role (staff, owner or member at another gym), the login is anonymised too:
  no email, name, phone or password, and sessions, devices and all chat go. Otherwise only the member side goes; a
  staff login stays until the owner removes it.
- An access token issued before the deletion lasts up to 15 minutes. It can't reach member data (the row is gone from
  that login) and can't post in chat (`MEMBERSHIP_NOT_ACTIVE`).
- Two deletions at once: the second gets `404` (the row is claimed first, inside the transaction).
- Wrong password: `403 INVALID_PASSWORD` (not 401, so the apps don't treat it as an expired session). 5 attempts per
  15 minutes. Each deletion is logged with the gym, member and whether the login was deleted.

---

## Automated status transitions

### ACTIVE → EXPIRED
Triggered by: `MembershipExpiryJob` cron (runs daily at 01:00 UTC)

Condition: `status = 'ACTIVE'` AND `expiry_date < today`

### EXPIRED → SUSPENDED
Triggered by: `AutoSuspendJob` cron (runs daily at 02:00 UTC)

Condition: `status = 'EXPIRED'` AND `expiry_date < now() - gym.auto_suspend_months`

Config: `gyms.auto_suspend_months` (default: `3`). Stored per gym so each gym can configure their own inactivity window.

Rationale: Members who have been expired for an extended period with no renewal activity are suspended to reflect their inactive relationship with the gym. This is not punitive — it is an operational status that prevents stale EXPIRED records from accumulating indefinitely.

See [cron-jobs.md](../03-engineering/cron-jobs.md) for cron job architecture and implementation rules.
