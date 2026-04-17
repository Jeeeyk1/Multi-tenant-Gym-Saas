# Identity Domain

## Purpose

The Identity domain manages:

- user accounts
- authentication (login/logout)
- session management
- token lifecycle
- account activation (invitation flow)

It is the entry point for all users: org owners, gym staff, and gym members.

---

## Core entity

### User

Represents a person in the system.

Key fields:

- id
- email (globally unique)
- password_hash
- full_name
- phone
- system_role
- is_active
- email_verified_at
- created_at
- updated_at

---

## User types

A user account belongs to exactly one context:

- an organization (org owners, co-owners, org admins)
- a gym (gym staff or gym member)

One person cannot share a single account across multiple gyms or organizations. If a person operates in two separate gyms, they have two separate accounts with two different email addresses.

---

## Two login flows

### Flow 1 — Organization login (owners and org admins)

1. User enters organization slug (e.g. `fitlife`)
2. Client calls `POST /auth/resolve-code` — system confirms it's an org
3. User enters email and password
4. `POST /auth/org/login` — system validates credentials and org membership
5. JWT issued with `{ userId, organizationId, orgRole }`

### Flow 2 — Gym login (staff and members)

1. User enters gym code (e.g. `FITMNL`)
2. Client calls `POST /auth/resolve-code` — system confirms it's a gym
3. User enters email and password
4. `POST /auth/gym/login` — system validates credentials and gym membership
5. JWT issued with `{ userId, gymId, roles, permissions }`

---

## Login validation rules

For both flows:

- `users.is_active` must be `true`
- `email_verified_at` must not be null (account must be activated)
- user must have a valid record in the resolved org or gym

Login is **not** affected by membership status:

| Status | Can login |
|---|---|
| ACTIVE | ✅ |
| EXPIRED | ✅ |
| SUSPENDED | ✅ |
| `is_active = false` | ❌ |

---

## Suspension rule

Suspension is **gym-scoped**, not account-global.

`gym_members.status = 'SUSPENDED'` blocks gym feature access within that gym only. It does not prevent login.

`users.is_active = false` is the only platform-level login block. It is set by SUPER_ADMIN only, never by gym staff.

---

## Invitation flow

### Org owner onboarding

1. Gym owner subscribes to the platform
2. Platform team (or automated flow) creates organization + owner account
3. Invitation email sent to owner with activation link
4. Owner sets password → account activated

### Staff onboarding

1. Org owner or manager invites staff via the app
2. System creates user account (no password yet)
3. System generates invitation token (`user_tokens` with type `INVITE`)
4. Email sent to staff with activation link
5. Staff sets password → `email_verified_at` set → account active

### Member onboarding

1. Gym staff registers member via the app
2. System creates user account (no password yet)
3. System generates invitation token
4. Email sent to member with activation link
5. Member sets password → account active
6. Member is enrolled in gym community conversation automatically

---

## Token model

### Access token

- Short-lived: 15 minutes
- Contains: `userId`, and either `{ organizationId, orgRole }` or `{ gymId, roles, permissions }`
- Never stored in DB

### Refresh token

- Long-lived: 7 days
- Stored as SHA-256 hash in `refresh_tokens` table
- Raw token sent to client only (HTTP-only cookie on web, secure storage on mobile)
- Rotated on every use

---

## Token flow

### Login
1. Credentials validated
2. Access token generated
3. Refresh token generated, hashed, stored in DB
4. Both returned to client

### Refresh
1. Client sends refresh token
2. System validates: not revoked, not expired
3. Old token revoked, new access + refresh tokens issued in one transaction

### Logout
1. Refresh token revoked in DB
2. Access token expires naturally (no server-side invalidation needed given 15min TTL)

---

## Error cases

- Invalid credentials → generic error (do not reveal whether email exists)
- `users.is_active = false` → reject login
- Email not verified → reject login
- Code not found (`/auth/resolve-code`) → 404
- User has no account at the resolved gym/org → reject login
- Invalid or expired refresh token → reject, require re-login

---

## Security rules

- Passwords hashed with bcrypt, 12 rounds
- Refresh tokens stored as SHA-256 hash, never raw
- Invitation tokens: raw string stored (single-use, short-lived)
- Invitation tokens invalidated immediately on use
- Email must be globally unique

---

## Integration with other domains

### Members
- Membership status (`ACTIVE`, `EXPIRED`, `SUSPENDED`) affects feature access, not login
- Checked by gym-level feature guards after authentication

### Staff & RBAC
- Roles and permissions loaded at gym login
- Embedded in JWT for all subsequent requests
- Re-issued when roles change

### Gym
- `gymId` in JWT scopes all operations to a single gym
- Org-level JWT validates gym belongs to the org before accessing gym data

---

## Invariants

- Email must be globally unique
- Password must be hashed before storage
- A user must be active and verified to log in
- Refresh tokens must be rotated, never reused
- JWT gymId or organizationId must come from the server, never trusted from request body
