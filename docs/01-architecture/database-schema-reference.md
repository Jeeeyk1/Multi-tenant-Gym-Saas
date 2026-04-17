# Database Schema Reference

This document records confirmed schema decisions for the Gym SaaS platform.

The canonical migration history lives in `db/migrations/*.sql`.
The Prisma schema mirrors the current state in `prisma/schema.prisma`.

---

## Conventions

- All primary keys: `uuid` using `gen_random_uuid()`
- All timestamps: `timestamptz` stored in UTC
- Calendar dates (not moments): `date` type (e.g. `expiry_date`)
- Soft deletes: `is_active`, `status`, or `is_deleted` — never hard delete user/member/transaction data
- Naming: `snake_case` in DB, `camelCase` in TypeScript/Prisma

---

## Notable schema decisions

### `gyms.code`

Each gym has a short unique code used as the entry point for gym-level login.

```sql
code  varchar(20) UNIQUE NOT NULL
-- e.g. 'FITMNL', 'IRONCEBU'
-- Uppercase alphanumeric, auto-generated on gym creation
-- Changeable by org owner
```

Rationale: gym-level users (staff and members) enter this code at the start of the login flow to identify which gym they are logging into. The organization slug serves the same purpose for org-level users.

---

### `gyms.auto_checkout_hours`

Each gym configures how many hours before a forgotten check-in is automatically closed.

```sql
auto_checkout_hours  int NOT NULL DEFAULT 5
-- Number of hours after check-in before AutoCheckoutJob closes it automatically
-- Configurable per gym. Default: 5 hours.
```

Used by: `AutoCheckoutJob` cron (every 15 minutes).

---

### `gyms.auto_suspend_months`

Each gym configures how long an EXPIRED membership remains before the member is auto-suspended.

```sql
auto_suspend_months  int NOT NULL DEFAULT 3
-- Number of months after expiry_date before AutoSuspendJob moves status to SUSPENDED
-- Configurable per gym. Default: 3 months.
```

Used by: `AutoSuspendJob` cron (daily at 02:00 UTC).

---

### `check_ins.is_out_of_hours`

Check-ins are not blocked when a gym is outside its scheduled hours. Instead, out-of-hours check-ins are flagged for staff review.

```sql
is_out_of_hours  boolean NOT NULL DEFAULT false
-- true = check-in occurred outside the gym's scheduled hours
-- false = check-in occurred within scheduled hours or gym is 24/7
```

Rationale: hard blocking leads to poor member experience when schedules are stale or exceptions are made verbally. The flag preserves auditability without blocking legitimate check-ins.

For 24/7 gyms (`gyms.is_247 = true`), no schedule validation runs and `is_out_of_hours` is always `false`.

---

### `check_ins.is_auto_checkout`

Distinguishes between a manual checkout and one performed by the `AutoCheckoutJob`.

```sql
is_auto_checkout  boolean NOT NULL DEFAULT false
-- true = checked_out_at was set by the AutoCheckoutJob cron, not by a user action
-- false = member or staff initiated the checkout
```

---

## Gym code generation

`gyms.code` is a 12-character uppercase alphanumeric code generated from the gym name at creation time. It cannot be changed after creation.

### Algorithm

```
1. Uppercase the gym name
2. Remove all non-alphanumeric characters (spaces, punctuation)
3. Remove all vowels (A, E, I, O, U)
4. Take the first 7 characters of the result (use fewer if name is short)
5. Append random uppercase alphanumeric characters to reach 12 total characters
6. Check DB for uniqueness — if collision, regenerate the random suffix only
7. Retry up to 5 times; if all collide, fall back to a fully random 12-character code
```

### Examples

| Gym name | After strip + devowel | Name part (7) | Random suffix | Final code |
|---|---|---|---|---|
| AnytimeFitness | NYTMFTNSS | NYTMFTN | 2K9PX | NYTMFTN2K9PX |
| Iron Gym | RNGYM | RNGYM | 2K9PX1Q | RNGYM2K9PX1Q |
| Fit | FT | FT | 1Q3WX9KP2R | FT1Q3WX9KP2R |

### Character set for random suffix

Uppercase letters and digits, excluding ambiguous characters: `0`, `O`, `1`, `I`, `L`.

Safe set: `ABCDEFGHJKMNPQRSTUVWXYZ23456789`

---

## Table overview

| Table | Domain | Key notes |
|---|---|---|
| users | Identity | Global unique email. One account per gym context. |
| user_tokens | Identity | Email verification, password reset, invite tokens |
| refresh_tokens | Identity | Hashed. Rotated on every use. |
| organizations | Org | Tenant root. Has a `slug` for org-level login. |
| organization_members | Org | Org-level roles: OWNER, CO_OWNER, ORG_ADMIN |
| plans | Billing | SaaS subscription tiers. Seeded. |
| plan_features | Billing | Feature flags per plan. |
| subscriptions | Billing | One active subscription per org. |
| invoices | Billing | Payment paper trail. Never delete. |
| gyms | Gym | Physical branches. Has `code` for gym login, `auto_checkout_hours`, `auto_suspend_months`. |
| gym_profile | Gym | Branding and contact info. One-to-one with gyms. |
| gym_schedules | Gym | Operating hours per day of week. |
| gym_features | Gym | Per-gym feature flags. |
| roles | RBAC | Seeded system roles (MANAGER, FRONT_DESK, TRAINER). |
| permissions | RBAC | Granular action keys. Seeded. |
| role_permissions | RBAC | Maps roles to permissions. |
| gym_staff | RBAC | User-to-gym employment relationship. |
| gym_staff_roles | RBAC | Role assignments per staff member. |
| membership_plans | Members | Gym-defined tiers with pricing and duration. |
| gym_members | Members | Member enrollment per gym. One member = one gym. |
| member_privacy | Members | Privacy settings. Auto-created on enrollment. |
| membership_renewals | Members | Renewal audit log. Never delete. |
| check_ins | Check-ins | Every gym visit. Has `is_out_of_hours` and `is_auto_checkout` flags. |
| conversations | Chat | Chat containers. Community auto-created with gym. |
| conversation_members | Chat | Who is in each conversation. |
| messages | Chat | Every message. Soft delete only. |
| message_reads | Chat | Per-message read receipts. |
| message_reactions | Chat | Emoji reactions. |
| announcements | Announcements | Staff broadcasts to members. |
| announcement_reads | Announcements | Tracks who has read each announcement. |
| ai_usage_log | AI | Token usage tracking per org. |

---

## Key constraints

- `users.email` — globally unique
- `gym_members(gym_id, user_id)` — unique (one membership per gym)
- `gym_members.membership_number` — globally unique
- `gym_members.qr_code_token` — globally unique
- `gyms.code` — globally unique
- `gyms.checkin_qr_token` — globally unique
- `check_ins` — only one active check-in per member enforced at DB level (partial unique index on `member_id` where `checked_out_at IS NULL`)
- `gym_staff(gym_id, user_id)` — unique
- `gym_staff_roles(gym_staff_id, role_id)` — unique

---

## Key indexes

```sql
-- Login resolution
CREATE UNIQUE INDEX idx_gyms_code ON gyms(code);
CREATE UNIQUE INDEX idx_organizations_slug ON organizations(slug);

-- Auth
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_user_tokens_token ON user_tokens(token) WHERE is_used = FALSE;
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash) WHERE is_revoked = FALSE;

-- Gym queries
CREATE INDEX idx_gyms_org ON gyms(organization_id, status);

-- Staff
CREATE INDEX idx_gym_staff_user_gym ON gym_staff(user_id, gym_id) WHERE is_active = TRUE;

-- Members
CREATE INDEX idx_gym_members_qr ON gym_members(qr_code_token);
CREATE INDEX idx_gym_members_expiry ON gym_members(gym_id, expiry_date, status);
CREATE INDEX idx_gym_members_user ON gym_members(user_id);
CREATE INDEX idx_gym_members_number ON gym_members(membership_number);

-- Check-ins
CREATE UNIQUE INDEX idx_checkins_one_active ON check_ins(member_id)
  WHERE checked_out_at IS NULL;
CREATE INDEX idx_checkins_active ON check_ins(gym_id, checked_out_at)
  WHERE checked_out_at IS NULL;
CREATE INDEX idx_checkins_member ON check_ins(member_id, checked_in_at DESC);

-- Chat
CREATE INDEX idx_messages_feed ON messages(conversation_id, sent_at DESC)
  WHERE is_deleted = FALSE;
CREATE INDEX idx_conv_members_user ON conversation_members(user_id);

-- Announcements
CREATE INDEX idx_announcements_gym ON announcements(gym_id, status, publish_at);

-- AI
CREATE INDEX idx_ai_usage_org_date ON ai_usage_log(organization_id, used_at);
```
