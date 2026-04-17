# Implementation Phases

This document defines the build order for the Gym SaaS platform.

Each phase has a clear goal, a list of deliverables, and a note on what it unblocks.
Phases must be completed in order unless explicitly noted as parallelizable.

Progress for each phase is logged in `docs/progress/`.

---

## Phase 1 — Database Schema

**Goal:** Establish the complete database schema as SQL migration files and align Prisma schema.

**Nothing else can begin until this is done.**

### Deliverables

SQL migrations (in this order):
```
db/migrations/
  0002_users.sql
  0003_organizations.sql
  0004_gyms.sql
  0005_gym_profile_schedules_features.sql
  0006_roles_permissions.sql
  0007_gym_staff.sql
  0008_plans_subscriptions.sql
  0009_membership_plans.sql
  0010_gym_members.sql
  0011_check_ins.sql
  0012_conversations_messages.sql
  0013_announcements.sql
  0014_ai_usage.sql
  0015_indexes.sql
```

Seed files:
```
db/seeds/
  001_roles.sql
  002_permissions.sql
  003_role_permissions.sql
  004_plans.sql
```

Prisma schema:
```
prisma/schema.prisma  ← fully aligned with migrations
```

### Acceptance criteria
- `pnpm db:migrate` runs cleanly from scratch
- `pnpm db:seed` runs cleanly and is idempotent
- `pnpm prisma:generate` succeeds with no errors
- All tables, indexes, and constraints match `docs/01-architecture/database-schema-reference.md`

---

## Phase 2 — API Foundation

**Goal:** Complete the NestJS bootstrap so every subsequent phase builds on solid, shared infrastructure.

### Deliverables

```
apps/api/src/
  common/
    prisma/
      prisma.module.ts
      prisma.service.ts
    redis/
      redis.module.ts
      redis.service.ts
    guards/
      jwt-auth.guard.ts
      permissions.guard.ts
    decorators/
      require-permission.decorator.ts
      current-user.decorator.ts
    errors/
      domain.error.ts          ← base class
      not-found.error.ts
      forbidden.error.ts
      conflict.error.ts
```

### Acceptance criteria
- Prisma service connects to DB successfully
- Redis service connects successfully
- JWT guard rejects requests without valid token
- Permissions guard enforces `@RequirePermission()` correctly
- Global exception filter maps domain errors to consistent HTTP responses

---

## Phase 3 — Identity Module

**Goal:** All login, logout, token refresh, and account activation flows working.

### Deliverables

```
apps/api/src/modules/identity/
  presentation/
    controllers/auth.controller.ts
    dto/
  application/
    use-cases/
      resolve-code.use-case.ts
      org-login.use-case.ts
      gym-login.use-case.ts
      refresh-token.use-case.ts
      logout.use-case.ts
      activate-account.use-case.ts
  domain/
    errors/
  infrastructure/
    persistence/
  identity.module.ts
```

Endpoints:
```
POST /auth/resolve-code      → public
POST /auth/org/login         → org-level JWT
POST /auth/gym/login         → gym-level JWT
POST /auth/refresh           → rotate refresh token
POST /auth/logout            → revoke refresh token
POST /auth/activate          → set password + verify email
```

### Acceptance criteria
- Org login returns JWT with `organizationId` and `orgRole`
- Gym login returns JWT with `gymId`, `roles`, `permissions`
- Refresh token rotates atomically (old revoked, new issued in one transaction)
- Activation sets `password_hash` and `email_verified_at`
- Invalid credentials return generic 401 (no email enumeration)

---

## Phase 4 — Organization & Gym Modules

**Goal:** Tenant hierarchy in place. Orgs and gyms can be created and resolved.

### Deliverables

```
apps/api/src/modules/
  organization/
  gym/
```

Endpoints:
```
POST   /organizations                  → create org
GET    /organizations/:slug            → resolve by slug

POST   /gyms                           → create gym (with auto-records)
GET    /gyms/:code                     → resolve by code
GET    /gyms/:id                       → gym detail
PATCH  /gyms/:id/profile               → update profile
PATCH  /gyms/:id/schedules             → update schedules
```

Key use cases:
- `CreateGymUseCase` — single transaction: gym + profile + schedules (Mon–Sun defaults) + community conversation

### Acceptance criteria
- Gym creation auto-generates `code` using the name-based algorithm
- Gym creation auto-creates profile, 7 schedule rows, and one community conversation
- `resolve-code` correctly distinguishes org slugs from gym codes

---

## Phase 5 — Staff & RBAC Module

**Goal:** Staff can be invited to gyms, roles assigned. Permission guard works end-to-end.

### Deliverables

```
apps/api/src/modules/staff/
```

Endpoints:
```
POST   /gyms/:gymId/staff                          → invite staff
DELETE /gyms/:gymId/staff/:staffId                 → deactivate
POST   /gyms/:gymId/staff/:staffId/roles           → assign role
DELETE /gyms/:gymId/staff/:staffId/roles/:roleId   → remove role
GET    /gyms/:gymId/staff                          → list staff
```

### Acceptance criteria
- Inviting staff creates a `users` record + `gym_staff` record + sends invitation email
- Role assignment unions permissions correctly into JWT on next login
- `@RequirePermission('staff.manage')` rejects callers without that permission
- Gym-scoped: staff from Gym A cannot be seen or managed via Gym B's endpoints

---

## Phase 6 — Membership Plans & Members Module

**Goal:** Gym-defined plans exist and members can be enrolled.

### Deliverables

```
apps/api/src/modules/
  membership-plans/
  members/
```

Endpoints:
```
POST   /gyms/:gymId/plans              → create plan
PATCH  /gyms/:gymId/plans/:id          → update plan
GET    /gyms/:gymId/plans              → list plans

POST   /gyms/:gymId/members            → register member
GET    /gyms/:gymId/members            → list (paginated)
GET    /gyms/:gymId/members/:id        → member detail
PATCH  /gyms/:gymId/members/:id/suspend
PATCH  /gyms/:gymId/members/:id/reactivate
GET    /gyms/:gymId/members/:id/qr     → member QR token
```

Key use case:
- `RegisterMemberUseCase` — single transaction: user + gym_member + member_privacy + conversation_member + invitation token + email

### Acceptance criteria
- Member registration auto-generates `qr_code_token` and `membership_number`
- Invitation email is sent with activation link
- Member is auto-enrolled in the gym's default community conversation
- `member_privacy` row auto-created with defaults
- Suspension blocks check-in but does not affect login

---

## Phase 7 — Check-ins & Renewals Module

**Goal:** Members can check in and out via all supported methods. Renewals are processed and logged.

### Deliverables

```
apps/api/src/modules/
  check-ins/
  renewals/
```

Endpoints:
```
POST   /gyms/:gymId/checkins              → check in (all 4 methods)
PATCH  /gyms/:gymId/checkins/:id/checkout → manual checkout
GET    /gyms/:gymId/checkins/active       → who is currently in gym
GET    /gyms/:gymId/checkins              → history (paginated)

POST   /gyms/:gymId/members/:id/renew    → process renewal
GET    /gyms/:gymId/members/:id/renewals → renewal history
```

### Acceptance criteria
- All 4 check-in methods (`MANUAL_STAFF`, `QR_STAFF_SCAN`, `QR_SELF_SCAN`, `APP_SELF_CHECKIN`) work
- Duplicate check-in is rejected (DB unique index + runtime check)
- Stale open check-in is auto-closed at check-in time if past `auto_checkout_hours`
- `is_out_of_hours = true` when check-in is outside schedule (using gym timezone)
- 24/7 gyms skip schedule validation entirely
- Renewal updates `expiry_date` and inserts a `membership_renewals` record in one transaction

---

## Phase 8 — Cron Jobs Module

**Goal:** Automated lifecycle transitions run reliably in the background without duplicate execution.

**Requires:** Phases 6 and 7 complete.

### Deliverables

```
apps/api/src/cron/
  cron.module.ts
  shared/
    cron-lock.service.ts
  jobs/
    membership-expiry.job.ts
    auto-suspend.job.ts
    auto-checkout.job.ts
    announcement-publisher.job.ts
```

### Acceptance criteria
- Each job acquires Redis lock before running
- If lock is already held, job skips silently with a log entry
- Jobs process in batches of 100
- `MembershipExpiryJob`: ACTIVE → EXPIRED when `expiry_date < today`
- `AutoSuspendJob`: EXPIRED → SUSPENDED after `auto_suspend_months`
- `AutoCheckoutJob`: closes stale check-ins, sets `is_auto_checkout = true`
- `AnnouncementPublisherJob`: publishes scheduled, expires outdated announcements
- All jobs are idempotent (safe to run twice)

---

## Phase 9 — Announcements Module

**Goal:** Staff can broadcast announcements. Members can view and mark them as read.

**Requires:** Phase 6 complete. Phase 8 (cron) handles auto-publish/expire.

### Deliverables

```
apps/api/src/modules/announcements/
```

Endpoints:
```
POST   /gyms/:gymId/announcements        → create (DRAFT or PUBLISHED)
PATCH  /gyms/:gymId/announcements/:id    → update / schedule
DELETE /gyms/:gymId/announcements/:id    → archive
GET    /gyms/:gymId/announcements        → list
POST   /gyms/:gymId/announcements/:id/read → mark as read
```

### Acceptance criteria
- Staff see all statuses; members only see PUBLISHED
- `publish_at` in the future → status set to SCHEDULED
- `publish_at` null or past → status set to PUBLISHED immediately
- Read tracking per user per announcement

---

## Phase 10 — Community Chat Module

**Goal:** Basic gym-wide community messaging working.

**Requires:** Phase 6 complete (members auto-enrolled in conversation on registration).

### Deliverables

```
apps/api/src/modules/chat/
```

Endpoints:
```
GET    /gyms/:gymId/conversations/:id/messages        → paginated feed
POST   /gyms/:gymId/conversations/:id/messages        → send message
DELETE /gyms/:gymId/conversations/:id/messages/:msgId → soft delete
POST   /gyms/:gymId/conversations/:id/messages/:msgId/react → emoji reaction
POST   /gyms/:gymId/conversations/:id/read            → update last_read_at
```

### Acceptance criteria
- Only conversation members can read or send messages
- Deleted messages return "This message was deleted" (soft delete, content wiped)
- `last_read_at` updated on read, used for unread count
- Pagination uses `sent_at DESC` with cursor or offset

---

## Phase 11 — Web Application

**Goal:** Staff and org owners have a working web interface.

**Requires:** Phases 3–10 complete.

Build order within web:
1. Code entry → login → account activation
2. Org dashboard (gym list, org settings, billing)
3. Gym dashboard (overview, key metrics)
4. Staff management
5. Membership plans
6. Member management + registration
7. Check-in dashboard (active members, history)
8. Renewals
9. Announcements management

---

## Phase 12 — Mobile Application

**Goal:** Members and staff have a working mobile interface.

**Requires:** Phases 3–10 complete.

Build order within mobile:
1. Code entry → login → account activation
2. Home / dashboard
3. Check-in (QR scan + app self check-in)
4. Announcements feed
5. Community chat
6. Profile + personal QR code

---

## Parallelization notes

After Phase 6 is complete, these phases are independent and can be worked in parallel:
- Phase 7 (Check-ins & Renewals)
- Phase 9 (Announcements)
- Phase 10 (Community Chat)

Phase 8 (Cron Jobs) can begin as soon as Phases 6 and 7 are done.

Phases 11 and 12 (web and mobile) can begin in parallel once the API phases they depend on are stable.
