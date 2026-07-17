# Production Readiness Review

**Status:** living checklist — worked top-down, status column updated as items close.
**First reviewed:** 2026-07-16 (Head-of-Engineering pre-launch audit, evidence-based, no code changed).
**Context:** first paying clients imminent (1–5 gyms). Infra plan: `production-infra-plan` (single
Hetzner CPX21, Caddy, self-hosted Postgres + R2 backups, GitHub Actions → PM2). Companion docs:
`performance-and-scaling.md`, `../implementation/billing-and-subscriptions.md`.

---

## How to read this

Findings are grouped by severity. **P0 blocks the public launch**; P1 should land before or
immediately after; P2 is post-launch hardening. Each item lists the evidence (file:line) and the
fix. Multi-tenant isolation is weighted highest on purpose — per `CLAUDE.md`, cross-tenant leaks
are critical bugs, and competing gyms are the tenants.

---

## Summary

| # | Severity | Finding | Status |
|---|----------|---------|--------|
| 1 | **P0** | Tenant isolation is enforced ad-hoc; at least one endpoint has no check | **Done 2026-07-17** |
| 2 | **P0** | Org-level tokens bypass gym-access + permission checks | **Done 2026-07-17** |
| 3 | **P0** | No automated test guards the tenant boundary | **Done 2026-07-17** |
| 4 | P1 | CORS is fully open (`*`) on HTTP and WebSocket | **Done 2026-07-17** |
| 5 | P1 | No app-level rate limit on `/auth/*` (brute-force / credential stuffing) | **Done 2026-07-17** |
| 6 | P1 | No security headers (`helmet` not wired) | **Done 2026-07-17** |
| 7 | P1 | Health check is shallow — 200 while Postgres/Redis are down | **Done 2026-07-17** |
| 8 | P2 | No error tracking (Sentry) | Open |
| 9 | P2 | Large-list pagination (cursor) not implemented | Open (perf Tier 3) |

---

## What is already solid (do not regress)

An honest baseline: the foundation is strong and does not need rework.

- **Config validated at boot** (`app.module.ts`, Joi schema) — a missing `JWT_SECRET`,
  `DATABASE_URL`, or `REDIS_URL` fails the process instead of running insecure.
- **No hardcoded fallback secrets** anywhere in the source.
- **Refresh tokens are hashed at rest and revoked on logout** (`logout.use-case.ts`) — not naive
  stateless-only auth. Access tokens are short-lived (15m).
- **Global exception filter**, subscription 402 guard, graceful shutdown (`enableShutdownHooks`
  + Prisma `$disconnect`), Redis-locked crons, and the Redis WebSocket adapter are all in place.
- **285 API tests pass**; typecheck clean across all apps. Perf Tier 1+2 (cache, pooling,
  indexes, compression) done.

---

## P0 — tenant isolation (blocks launch)

The unifying root cause: **isolation is enforced by a repeated manual check inside each use case,
keyed only on `gym`-type tokens, with no structural guard.** It mostly works — check-ins,
announcements, and badges all correctly call `assertGymAccess` — but "mostly" is not a boundary.

### 1. An endpoint with no tenant check at all
`GET /gyms/:gymId/conversations/default`
(`modules/chat/presentation/controllers/conversations.controller.ts:16`) reads `gymId` from the
URL, injects **no** `@CurrentUser()`, and queries directly. Any authenticated user can read
another gym's default conversation by changing the URL. Impact is limited (message reads are
separately gated by conversation membership), but it is a live cross-tenant read and proof the
pattern is not enforced by construction.

### 2. Org tokens bypass the checks
`assertGymAccess` and `assertPermission` (repeated across use cases) only throw when
`caller.type === 'gym'`. An **org token** (`OrgAuthUser` — `type: 'org'`, carries
`organizationId`, no `gymId`) passes both unconditionally on gym-scoped routes, and **nothing
validates that the target gym belongs to that org** (searched: only `get-organization.use-case.ts`
checks `organizationId`). Not reachable through the normal UI (clients use gym tokens for gym
routes), but textbook IDOR / privilege escalation — the first thing a malicious tenant or pentest
probes.

### 3. No test net
~88 gym-scoped use cases rely on every author remembering to call `assertGymAccess`. There is no
test that fires a foreign token at each `:gymId` route. The next missed check ships silently.

### Fix (structural, closes 1–3 together)
Introduce a `GymAccessGuard` bound to the `:gymId` route param, running after `JwtAuthGuard`:
- `gym` token → assert `token.gymId === param`.
- `org` token → resolve the org's owned gym ids and assert `param ∈` that set (reject otherwise).
- Attach the resolved scope to the request.

This makes isolation a property of the route, not of author discipline. Keep the per-use-case
`assertGymAccess` as defense-in-depth. Add one parametrized e2e test: for every `:gymId` route,
a token scoped to gym A requesting gym B's resource must return 403/404. Also audit the AI
controller (`@Controller('gyms/:gymId/members/:memberId')`) the same way — verify the caller may
act for that `memberId`, not just any member in the gym.

### ✅ Resolved 2026-07-17 — `GymAccessGuard`
Implemented as a **global** guard (`common/guards/gym-access.guard.ts`, registered in
`app.module.ts` before `SubscriptionStatusGuard` so a foreign gym can't even learn another org's
billing state). It activates on any route carrying a `:gymId` param (all 77 gym-scoped routes use
`@Param('gymId')` under a `gyms/:gymId` base path — uniform, nothing missed). It decodes the JWT
itself (like the subscription guard), so it needs no per-controller wiring:
- `gym` token → `token.gymId` must equal the `:gymId` in the URL.
- `org` token → the `:gymId` must belong to the caller's `organizationId` (gym→org lookup cached
  300s via `CacheService`; gyms never change org).
- `system_admin` → allowed; no/invalid token or non-`:gymId` route → pass through (JwtAuthGuard
  still 401s); unknown token shape → denied.

Per-use-case `assertGymAccess` retained as defense-in-depth. **Test net:** `gym-access.guard.spec.ts`
(10 cases — the full decision matrix). **Live-verified** against the running API with two real
gyms/orgs: own-gym 200, cross-tenant gym token 403, org-token cross-org 403, org-token-on-own-gym 200.

**Follow-ups (not blocking launch):** (a) a full parametrized e2e sweep firing a foreign token at
*every* `:gymId` route (the guard closes the class; the sweep would catch a future route that
somehow bypasses the global guard); (b) the AI controller's `:memberId` sub-scoping — the guard
confirms the caller may access the *gym*, but not that a specific `memberId` belongs to them vs.
another member in the same gym. Lower severity (same-gym), worth a pass later.

---

## P1 — standard hardening (before or right after launch)

### 4. CORS fully open
`main.ts:40` is a bare `app.enableCors()` (all origins); the WS adapter
(`redis-io.adapter.ts:43`) and chat gateway (`chat.gateway.ts:83`) use `origin: '*'`. Restrict all
three to the real frontend origins (`app.`, `admin.`, landing) via `ConfigService`.

### 5. No login rate limiting
The custom `RateLimiterService` covers AI queries and lead submission, but `/auth/*` has none —
login is open to brute-force / credential stuffing. `fail2ban` (infra plan) is network-level and
will not catch this. Add `@nestjs/throttler` (or reuse `RateLimiterService`) on the auth routes.

### 6. No security headers
`helmet` is not wired. Add it in `main.ts` (one line).

### 7. Shallow health check
`modules/health/health.controller.ts` checks only heap — it returns 200 even if Postgres or Redis
is down, so the UptimeRobot monitor in the infra plan would show green during a real outage. Add
Terminus DB + Redis indicators.

### ✅ Resolved 2026-07-17 — P1 hardening batch
- **CORS** now scoped to `app.corsOrigins` (from `CORS_ORIGINS` env, comma-separated; defaults to
  local dev ports). Applied to HTTP (`main.ts` `enableCors`) and WebSocket (`redis-io.adapter.ts`
  `createIOServer`); the chat gateway decorator no longer hardcodes `origin: '*'`. Live-verified:
  configured origin gets an `Access-Control-Allow-Origin`, `evil.com` does not.
- **Auth throttle** — `AuthThrottleGuard` (`identity/presentation/guards/`) backed by the shared
  Redis `RateLimiterService` (cluster-safe across PM2 workers, unlike an in-memory throttler),
  10 attempts / 60s per IP per route, on `org/login`, `gym/login`, `admin/login`, `forgot-password`.
  Left `refresh`/`logout`/`reset-password` unthrottled (token-gated or frequent). Live-verified:
  attempts 1–10 → 401, 11+ → 429. Also set Express `trust proxy` so `req.ip` is the real client
  behind Caddy.
- **helmet** wired in `main.ts` (`app.use(helmet())`). Live-verified: CSP, HSTS,
  X-Content-Type-Options, X-Frame-Options present.
- **Deep health check** — `PrismaHealthIndicator` (`SELECT 1`) + `RedisHealthIndicator` (`PING`)
  added to `/health` (DB + Redis first, then heap). Live-verified: reports `database`/`redis` up;
  a down dependency now fails the probe (503) instead of a false green.
- Verified: API typecheck clean, 295/295 tests pass.

---

## P2 — post-launch hardening

### 8. Error tracking
Promote Sentry from "optional" (infra plan) to "before the first paying client." At 1–5 gyms you
need exceptions on a dashboard, not relayed by an annoyed owner.

> **Related — request-correlation logging: done 2026-07-17.** Every request now carries an
> `X-Request-Id` (returned on the header and in error bodies), auto-prefixed onto every log line,
> and every failed request logs the caller's identity/tenant. This is the debugging foundation
> Sentry builds on. Full detail: `logging-and-observability.md`. Remaining there: surface the id on
> frontend error UI, then structured JSON (pino), then Sentry.

### 9. Cursor pagination
Member and other large lists are unbounded (perf doc Tier 3, #9). Land before any gym gets large.

---

## Recommended sequence

1. **P0 `GymAccessGuard` + isolation test** — highest leverage; closes findings 1 and 2, and 3 is
   the guardrail against the next regression. Gate launch on this.
2. **P1 batch** (CORS, auth throttle, helmet, deep health check) — small, well-understood, do in
   one pass.
3. **P2** after launch, as the client count grows.
