# Tech Debt

Tracked items that are known problems or improvements deferred for later.
Each entry includes what it is, why it matters, and rough effort.

---

## 1. Structured logging

**What:** The API uses `console.log` / NestJS's default `Logger` with no log levels, no correlation IDs, and no structured JSON output. Errors surface as plain strings.

**Why it matters:**
- Can't filter by severity or module in production
- No request tracing — impossible to correlate a frontend error to a backend log
- No centralised log shipping (e.g. to Datadog, Logtail, Axiom)

**What good looks like:**
- Replace `Logger` calls with a Pino-based structured logger (`nestjs-pino`)
- Add a request-scoped correlation ID header (`X-Request-Id`) propagated through every log line
- Log entry shape: `{ level, timestamp, requestId, module, message, ...context }`
- Separate log levels per environment: `debug` in dev, `info`+ in prod

**Effort:** M (2–3 days)

---

## 2. Email templates — move to a proper templating engine

**What:** Email HTML is currently inline strings in `email.service.ts`. Works for now but hard to maintain as the number of email types grows.

**Why it matters:**
- Designers can't edit templates without touching TypeScript
- No way to preview templates in isolation
- Duplication risk as more email types are added

**What good looks like:**
- Adopt [react-email](https://react.email) or [MJML](https://mjml.io) for template authoring
- Templates live in `apps/api/src/common/email/templates/`
- `EmailService` renders them with data before sending
- Local preview script so templates can be QA'd without sending

**Effort:** S–M (1–2 days)

---

## 3. pnpm monorepo React version conflict (mobile)

**What:** The workspace root `node_modules/react` symlinks to `react@18.3.1` (pulled by Next.js web/admin apps). The mobile app uses `react@19.1.0`. Metro's `nodeModulesPaths` falls back to the workspace root, pulling in React 18 and causing "multiple copies of React" runtime errors.

**Current workaround:** `metro.config.js` uses `resolver.resolveRequest` to pin all `react` imports to mobile's own `node_modules/react`. This suppresses the error but is fragile — if a new dependency introduces its own React requirement it may break again.

**Proper fix:**
- Add `pnpm.overrides` in root `package.json` to force a single React version across the workspace, OR
- Separate the mobile app into its own pnpm workspace so it doesn't share `node_modules` with the web apps
- Long term: align web apps to React 19 so there's only one version in the tree

**Effort:** S–M (1 day) for overrides; L (1 week) for workspace separation

---

## 4. `.env` management — consolidate to root only

**What:** Multiple `.env` files across apps caused silent config conflicts (e.g. `apps/api/.env` had stale/wrong `DATABASE_URL` that overrode the correct root `.env`). Fixed partially — `apps/api/.env` is now cleared.

**What remains:**
- No `.env.example` at root that mirrors all keys (the existing one is stale)
- `apps/web/.env.example` and `apps/mobile/.env.example` are separate
- No validation that app-level `.env` files don't accidentally redefine infrastructure keys

**What good looks like:**
- Single canonical `/.env.example` covering all apps
- CI check that `apps/*/` `.env` files don't define keys that live in root
- Document the two-tier model in `docs/03-engineering/` clearly

**Effort:** S (half day)

---

## 5. API versioning strategy

**What:** Routes are currently prefixed with `api/v1` in the root `.env` but the NestJS app doesn't formally version its controllers (no `@Version()` decorator or `enableVersioning()`). If we ever need to introduce breaking changes, there's no clean path.

**What good looks like:**
- Enable NestJS URI versioning (`app.enableVersioning({ type: VersioningType.URI })`)
- All current controllers become `v1` explicitly
- New breaking changes ship as `v2` endpoints alongside `v1`

**Effort:** S (1 day) — mostly mechanical

---

## 6. Missing activation flow for member mobile app

**What:** When a member is invited, they receive an email with a `member-activate?token=...` link, but the `/member-activate` page doesn't exist yet in `apps/web` (or the mobile deep link isn't wired). Members have no way to activate their account end-to-end without manual token injection.

**What good looks like:**
- `apps/web/src/app/member-activate/` page that accepts the token, sets password, redirects to "download the app" or directly to mobile deep link
- Mobile deep link handler that accepts the token and opens the activation screen

**Effort:** M (2–3 days)

---

## 7. Welcome email not sent after account activation

**What:** `EmailService.sendWelcome()` exists but is never called. The activation use case completes without sending a confirmation email.

**Fix:** Call `email.sendWelcome()` inside the activate account use case after `emailVerifiedAt` is set.

**Effort:** XS (30 min)

---

## 8. Token hashing — `user_tokens` stores raw tokens

**What:** `user_tokens.token` currently stores raw random tokens. If the database were ever breached, all active invite/reset tokens would be immediately usable.

**Best practice:** Store a SHA-256 hash of the token in the DB; send only the raw token in URLs. On lookup, hash the incoming token and compare.

**Impact:** Low immediate risk (tokens are short-lived), but worth fixing before any production launch.

**Effort:** S (1 day) — schema unchanged, only persistence + lookup logic changes

---

## 9. Test coverage

**What:** Most use cases have no unit or integration tests. A handful of specs exist (`register-member.use-case.spec.ts`, etc.) but coverage is sparse.

**What good looks like:**
- Unit tests for all use cases (mocked repository)
- Integration tests for critical paths: auth, member registration, check-in, renewal
- `pnpm test` runs in CI on every PR

**Effort:** L (ongoing — 1–2 weeks to reach meaningful coverage)
