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

**Suspension is gym-scoped.**
A member suspended at one gym can still log in and access other gyms they belong to.
Suspension only blocks access within the gym where it was applied.

`users.is_active = false` is the only platform-level login block. It is set by SUPER_ADMIN only, never by gym staff.

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
