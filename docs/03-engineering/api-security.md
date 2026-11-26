# API Security Standards

Rules every API change must follow. The API is the security boundary for all clients: web, admin
and mobile only make the UI convenient, and anything they check is re-checked here.

Infrastructure controls (Cloudflare, network, secrets, backups) are in
`docs/deployment/infrastructure-security.md`. Tenancy rules are in `docs/01-architecture/multi-tenancy.md`
and roles in `docs/01-architecture/auth-and-rbac.md`.

---

## 1. Authentication

### Token types

| Type | Issued by | Audience | Access life | Refresh |
|---|---|---|---|---|
| `gym` (member, staff, trainer, owner) | `POST /auth/gym/login` | gym API | 15 min | 7 days, rotating |
| `org` (organisation owner) | `POST /auth/org/login` | org API | 15 min | 7 days, rotating |
| `system_admin` | `POST /auth/admin/login` | admin API | ≤ 1 h | none; log in again |

- Admin tokens are signed with **their own secret** and carry `aud: "admin"`. A guard that accepts
  gym or org tokens must reject an admin token, and the reverse. Admin access to gym data goes through
  `/admin/*` routes, which are audited, not through the gym routes.
- Every token carries `iss`, `aud`, `sub`, `type`, `iat` and `exp`, and verification checks all of them.
  Algorithm is pinned to `HS256` on verify.
- `JWT_SECRET` values are at least 32 bytes; config validation enforces the length.

### Refresh tokens

- Opaque random values (`randomBytes(48)`), stored as a SHA-256 hash, never in plain text.
- **Rotation with reuse detection:** each refresh revokes the presented token and issues a new one in the
  same transaction. Presenting an already-revoked token revokes the whole family for that user and
  device, because it means the token was copied.
- Refresh re-reads the user's current state. Deactivated staff, suspended members and gyms whose
  subscription is cancelled get no new access token.
- Deactivating, suspending or removing a user revokes all their refresh tokens immediately and
  disconnects their open sockets.

### Passwords

- 8–72 characters (bcrypt ignores bytes past 72), checked against a short list of common passwords.
- bcrypt cost 12.
- Login errors are uniform: the same message and similar timing for a wrong email and a wrong password.
- After 10 failed logins for one account within 15 minutes, that account waits 15 minutes,
  whatever IP the attempts come from.
- **MFA (TOTP)** is required for system admins and offered to gym owners.

### One-time tokens (invite, activation, password reset)

- `randomBytes(32)`, stored hashed, single use, short life (reset 1 h, invite 72 h).
- **Sent by email only. Never returned in an API response**, not even to the admin or staff member who
  triggered it. If someone needs to resend, they call a resend endpoint that emails again.

---

## 2. Authorization

### Fail closed

- Auth is opt-in per route today, so **every new controller declares its guards**. A route without
  `JwtAuthGuard` is public, and must be listed in the public routes table below with a reason.
- `GymAccessGuard` protects routes with a `:gymId` param. Gym-scoped routes must live under
  `/gyms/:gymId/...` with exactly that param name, or the guard does not run.
- Permission checks use `assertPermission` / `assertGymAccess` from `common/auth/authorization.ts`.
  A non-gym token never passes a gym permission check implicitly.

### Tenancy

- The **token** defines the tenant (`gymId`, `organizationId`, `sub`), never the body or query.
- **Every secondary id is scoped.** When a route takes a `memberId`, `conversationId`, `replyToId`,
  `planId`, `badgeId`, `exerciseId`, `invoiceId` or similar, look it up together with the gym:
  `findFirst({ where: { id, gymId } })`. Looking up by `id` alone and then checking is how
  cross-tenant leaks happen.
- "Self" routes (`/members/me`, `/members/:memberId/...` for the member themself) compare the record's
  user id with `caller.sub`, not with another value from the request.
- A record that belongs to another gym returns **404**, not 403, so ids can't be probed.

### Public routes

Public routes are the attack surface. Each one is rate limited and returns the minimum data.

| Route | Why public | Limit |
|---|---|---|
| `GET /health` | Uptime checks | Returns status only, no versions |
| `POST /auth/*/login`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/activate`, `/auth/refresh` | Sign-in flows | Auth throttle + per-account lockout |
| `POST /auth/resolve-code`, `GET /gyms/:code` | Branded login page | Per-IP limit; name, colours and logo only |
| `GET /public/plans`, `POST /public/chat`, `POST /public/signup-requests` | Landing site | Per-IP limits, length caps |

Adding a public route means adding it to this table in the same PR.

---

## 3. Input validation

- Every body, query and param has a DTO class with `class-validator` rules. The global `ValidationPipe`
  runs with `whitelist` and `forbidNonWhitelisted`, so unknown fields are rejected.
- Every string has a `@MaxLength`, every array an `@ArrayMaxSize`, every number a `@Min` / `@Max`.
- Enums use `@IsEnum()` with the enum from `common/enums/` (see CLAUDE.md).
- **WebSocket events validate too.** Gateway handlers take DTO classes and use
  `@UsePipes(new ValidationPipe(...))`; a TypeScript interface does not validate anything at runtime.
- Raw SQL uses Prisma's tagged templates (`$queryRaw\`...\``) only. `$queryRawUnsafe` is not allowed.

---

## 4. Rate limiting

- The client IP comes from **one helper** that trusts only the proxy in front of the app: `req.ip`
  with Express `trust proxy` set for that hop, or `CF-Connecting-IP` when the request arrived through
  the Cloudflare tunnel. Never read the first value of a client-supplied `X-Forwarded-For`.
- Auth routes: 10 attempts per minute per IP and route, plus the per-account lockout above.
- Expensive routes (AI, uploads, bulk import, insights): a limit per user (`caller.sub`), plus the
  monthly AI allowance.
- A global default limit (e.g. 300 requests per minute per user) catches everything else.
- Counters use an atomic Redis operation (`INCR` + `EXPIRE` in one `MULTI` or a Lua script).

---

## 5. File uploads

- Every upload has a size limit and a file-type check on the **content** (magic bytes), not only the
  client's `mimetype` or the filename.
- Images go to Cloudinary with `resource_type: 'image'`; SVG is not accepted.
- Spreadsheet imports are parsed by a maintained library with row and column limits.
- Each upload route checks the caller's permission like any other write.

---

## 6. Outbound requests

- The API only fetches URLs it built itself or that point to an allow-listed host (Cloudinary).
  User-supplied URLs are never fetched directly, which prevents server-side request forgery (SSRF)
  into the server's private network.
- Every outbound call has a timeout and a response size limit.
- Provider base URLs come from `ConfigService` (see CLAUDE.md), so a test env never points at prod.

---

## 7. Responses, errors and logs

- Responses are mapped from the use case result. Never return a raw Prisma row, because it may hold
  password hashes, tokens or internal ids.
- Errors go through `GlobalExceptionFilter`: a stable code, a message, the request id. No stack traces
  or SQL in production responses.
- Logs never contain passwords, tokens, `Authorization` headers or health data. Log ids, not content.
- Admin and billing actions write to `audit_log`.

---

## 8. Headers and CORS

- `helmet()` stays on (HSTS, nosniff, frame options, CSP).
- CORS allows only the origins in `CORS_ORIGINS` (exact origins, no wildcards) with credentials.
  The WebSocket adapter uses the same list.
- WebSocket clients send the token in the `auth` payload of the handshake, not the query string,
  because query strings end up in proxy logs.

---

## 9. New endpoint checklist

Copy into the PR description for any new or changed route.

- [ ] Guards declared; if public, added to the public routes table with a limit
- [ ] Tenant comes from the token; every secondary id is looked up with `gymId`
- [ ] Permission checked with `assertPermission` (or the self check for member routes)
- [ ] DTO with max lengths, array sizes and enums; socket handlers validated too
- [ ] Response mapped; no tokens, hashes or other gyms' data
- [ ] Rate limit for anything expensive or unauthenticated
- [ ] Tests: wrong gym → 404, missing permission → 403, no token → 401

## 10. Testing

- Unit specs cover the permission and scoping branches of each use case.
- The integration suite on real Postgres runs a **cross-tenant sweep**: two gyms, a token from gym A
  against every `/gyms/:gymId` route of gym B, expecting 403 or 404 everywhere.
- Before each release: `pnpm audit --prod`, plus a short manual check of the public routes and the
  rate limits against the test environment.
