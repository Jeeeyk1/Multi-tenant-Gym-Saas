# Authentication and RBAC

This document defines authentication and authorization for the Gym SaaS platform.

---

## Identity model

All users exist in the `users` table.

Email is globally unique. One email address = one user account on the platform.

A user account belongs to either one organization (org-level) or one gym (gym-level). Cross-gym or cross-org access from a single account is not supported by design.

---

## Two login tiers

### Tier 1 — Organization login

For: owners, co-owners, org admins

Entry: organization slug (e.g. `fitlife`)

```
POST /auth/org/login
Body: { orgSlug, email, password }
```

Validates:
- org exists and is ACTIVE
- user exists and is_active = true
- user has a record in organization_members for this org

JWT issued:
```json
{
  "userId": "...",
  "organizationId": "...",
  "orgRole": "OWNER"
}
```

Access scope: full visibility across all gyms in the organization.

---

### Tier 2 — Gym login

For: gym staff and gym members

Entry: gym code (e.g. `FITMNL`)

```
POST /auth/gym/login
Body: { gymCode, email, password }
```

Validates:
- gym exists and is ACTIVE
- user exists and is_active = true
- user has a record in gym_staff OR gym_members for this gym

JWT issued (staff):
```json
{
  "userId": "...",
  "gymId": "...",
  "roles": ["STAFF"],
  "permissions": ["members.view", "members.create", "checkins.manage"]
}
```

JWT issued (member):
```json
{
  "userId": "...",
  "gymId": "...",
  "roles": ["MEMBER"],
  "permissions": ["checkins.self", "announcements.view"]
}
```

Access scope: scoped entirely to the resolved gym.

---

## Code resolution

Before login, clients call a shared public endpoint to resolve what type of code was entered:

```
POST /auth/resolve-code
Body: { code: "fitlife" }
```

Response:
```json
{ "type": "ORGANIZATION", "name": "Fitlife PH", "slug": "fitlife" }
```

Or:
```json
{ "type": "GYM", "name": "Fitlife Manila", "code": "FITMNL" }
```

Returns 404 if unrecognized. No authentication required. This drives the client login screen routing.

---

## Role separation

### 1. System role

Stored in: `users.system_role`

Values:
- `SUPER_ADMIN` — platform team only, internal admin panel
- `USER` — everyone else

Never store gym or org roles here.

---

### 2. Organization roles

Stored in: `organization_members.role`

Values:
- `OWNER` — full control, billing access
- `CO_OWNER` — full control, no billing
- `ORG_ADMIN` — manage gyms, no billing or ownership transfer

Scope: org-level actions only. Validated against org-level JWT.

---

### 3. Gym roles (RBAC)

Stored via: `gym_staff` → `gym_staff_roles` → `roles` → `role_permissions` → `permissions`

Predefined system roles: `OWNER`, `STAFF` and `TRAINER` (app only). The full matrix, and how staff who are
also members get a member view, are in `docs/02-domains/staff-and-rbac.md`.

---

## Permissions model

Permissions are granular action keys, listed in the `Permission` enum
(`apps/api/src/common/enums/permission.enum.ts`). `members.view` is the member list (name and status);
`members.details` adds contact details, plan, prices and payments.

Rules:
- a user can hold multiple roles simultaneously
- effective permissions = union of all assigned roles' permissions
- someone who is also a member of the gym also gets the `MEMBER` role and member permissions
- permissions are embedded in the JWT at login and refresh (`gymClaims()` in `modules/identity/domain`)
- DB is not queried for permissions on every request, so role changes apply at the next refresh

---

## Permission checking

Always check permissions. Never check role names directly.

Use-case code checks with the shared helpers in `apps/api/src/common/auth/authorization.ts` and the
`Permission` enum (`common/enums/permission.enum.ts`, which mirrors the `permissions` table):

✅ Correct:
```typescript
assertGymAccess(caller, gymId);
assertPermission(caller, Permission.MEMBERS_CREATE);
const canModerate = hasPermission(caller, Permission.CHAT_MANAGE);
```

Org tokens pass permission checks (`GymAccessGuard` has already scoped them to their own gyms). Don't
copy these checks into a module; add a helper here if a new pattern is needed. `@RequirePermission` with
`PermissionsGuard` also exists for controller-level checks.

❌ Incorrect:
```typescript
if (user.roles.includes('STAFF'))
```

---

## Guard behavior

`PermissionsGuard` must:
- read required permissions from decorator metadata
- check that `user.permissions` includes ALL required permissions (AND logic)
- reject if any required permission is missing

---

## JWT rules

- Access token lifetime: 15 minutes
- Refresh token lifetime: 7 days
- Refresh tokens stored as SHA-256 hash in DB, never raw
- Refresh tokens stored in HTTP-only cookie (web) or secure storage (mobile)
- Rotate refresh token on every use: revoke old, issue new in the same transaction
- Re-issue JWT after any role or permission change

---

## Token flow

### Login
1. Client calls `/auth/resolve-code` → gets org or gym context
2. Client calls `/auth/org/login` or `/auth/gym/login`
3. API validates credentials and membership in that org/gym
4. API issues access token + refresh token
5. Refresh token stored in DB (hashed)

### Refresh
1. Client sends refresh token
2. API validates token (not revoked, not expired)
3. API revokes old token, issues new access + refresh tokens

### Logout
1. API revokes refresh token
2. Access token expires naturally

---

## Gym scoping rules

For gym-level JWT:
- all operations must be scoped to `gymId` from the JWT
- never trust `gymId` from the request body for sensitive operations
- validate that the resource being accessed belongs to the JWT's `gymId`

For org-level JWT:
- validate that the gym being accessed belongs to the JWT's `organizationId`
- org-level users can read across all their gyms but must still pass org ownership check

---

## Common mistakes

- ❌ Checking roles instead of permissions
- ❌ Skipping gymId validation on gym-scoped queries
- ❌ Trusting gymId from request body instead of JWT
- ❌ Not refreshing JWT after role changes
- ❌ Allowing gym-level token to access org-level endpoints
- ❌ Allowing org-level token to bypass gym permission checks

---

## Design goal

Authorization must be:
- explicit — every protected route declares its required permission
- predictable — same rules apply everywhere
- consistent — no special cases or role-name shortcuts
- scope-safe — gym token cannot leak into org scope and vice versa
