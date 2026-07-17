# Logging & Observability

**Status:** request-correlation logging implemented 2026-07-17. Structured JSON (pino) and error
tracking (Sentry) are documented follow-ups, not yet built.

Goal: when a user reports "it broke," an engineer can find exactly what happened from a single
identifier, without guessing by timestamp.

---

## The correlation id (the load-bearing piece)

Every request is assigned an **`X-Request-Id`** and everything about that request is tagged with it.

- **Where it comes from:** `common/middleware/request-id.middleware.ts` (registered first in
  `main.ts`, before helmet). It accepts an inbound `X-Request-Id` — so a trace can span Caddy /
  Cloudflare if they set one — otherwise it mints a UUID.
- **How it propagates:** stored in an `AsyncLocalStorage` scope (`common/context/request-context.ts`)
  opened for the whole request. Any code — services, use cases, guards, the exception filter — can
  read it via `requestContext.getRequestId()` without it being passed through call signatures.
- **Where it surfaces:**
  - On the **response header** `X-Request-Id` (success and failure).
  - In every **error response body** as `requestId` (added by the global exception filter).
  - Prefixed onto **every log line** as `[req:<id>]` by `common/logger/request-context.logger.ts`
    (a `ConsoleLogger` subclass wired via `app.useLogger`). Existing `new Logger(...)` calls become
    correlatable automatically — no per-call change needed.

## What gets logged

- **Successful requests** — `common/interceptors/logging.interceptor.ts`. In development, every
  request (`METHOD url — Nms`). In production, only slow ones (≥ 500 ms, logged at `warn`). Health
  probes are never logged.
- **Failed requests** — `common/filters/global-exception.filter.ts` logs **every** 4xx and 5xx with
  the caller's identity and tenant:
  `METHOD url → <status> <CODE> | user=<sub> type=<gym|org|system_admin> gym=<id> org=<id>`
  (or `anon`). 5xx include the stack trace and log at `error`; 4xx log at `warn`. The `[req:<id>]`
  prefix is added automatically by the logger.

Logs emitted outside a request (cron jobs, bootstrap) simply have no `[req:<id>]` prefix.

---

## Debugging a user-reported issue

1. Get the id. The client shows it from the error body's `requestId` (or read the `X-Request-Id`
   response header from the network tab) — see "Frontend surfacing" below for exactly where this
   is wired up today.
2. On the server: `grep "req:<id>" <pm2 log file>` (`pm2 logs gym-api` locally). One value returns
   the failure line (with user/tenant/status/code) plus any `logger.debug/warn` lines that handler
   emitted during the same request.
3. The failure line tells you *who*, *which gym/org*, *which route*, and the domain error `code`.
   For a 5xx the stack is right there.

---

## Frontend surfacing

**Status: done 2026-07-18** for the highest-traffic error paths; not yet exhaustive across every
call site (see Roadmap).

Every client-side API layer captures `requestId` off the error response and attaches it to the
thrown `Error`, alongside the existing `code`/`statusCode`:
- `apps/mobile/src/services/api.ts` (`request` and `upload`)
- `apps/web/src/lib/api.ts` and `apps/web/src/lib/client-api.ts` (axios `normalizeError`)
- `apps/web/src/lib/actions/settings.ts` (`uploadGymLogo`'s raw `fetch`, doesn't go through the
  axios clients above)

A shared formatter turns that into user-facing text: `formatApiError(err, fallback)` —
`apps/mobile/src/lib/format-error.ts` and `apps/web/src/lib/format-error.ts` (same shape, kept as
two small files rather than a shared package since it's ~5 lines and the platforms don't otherwise
share a lib). Returns `"<message> (Ref: <first 8 chars of requestId>)"` when a request id is
present, else just the message. First 8 chars is a git-style short ref — short enough to read aloud
or screenshot, long enough that `grep`ing it server-side finds the one matching request.

**Wired into today:**
- Mobile: announcement creation (`app/(staff)/announcements.tsx`), chat message deletion
  (`app/(staff)/chat.tsx`), membership renewal (`app/(staff)/member/[id].tsx`).
- Web: gym settings save + schedule save (`components/settings/*.tsx`), and all five member
  actions — register/suspend/reactivate/renew/remove (`lib/actions/members.ts`). The
  `registerMember` "member already exists" branch is intentionally left as a plain message — it's
  an expected validation case, not a bug to trace.

**Not yet wired:** the rest of the app's `Alert.alert`/`toast.error`/inline-error call sites (there
are more across mobile and web) still show a plain fallback message with no reference. They weren't
touched in this pass — scoped to the surfaces most likely to generate a support question first.
Adopting the helper elsewhere is a mechanical, low-risk follow-up (swap the manual
`(err as {message?:string})?.message ?? fallback` for `formatApiError(err, fallback)`).

---

## Conventions

- **Use the NestJS `Logger`, never `console.log`** (also a CLAUDE.md rule). `console.log` bypasses
  the request-id prefix, log levels, and the production slow-only trimming.
- **Never log secrets or full PII** — no passwords, tokens, JWTs, payment references, or raw request
  bodies. Log ids (`user.sub`, `gymId`) and the domain error `code`, not the sensitive payload.
- Prefer `logger.debug(...)` for detail that's useful when tracing a specific request (it won't spam
  production unless the log level is raised) and `logger.warn/error` for things that need attention.

---

## Roadmap (not yet built)

1. **Frontend: extend `formatApiError` to the remaining call sites** (web + mobile) that don't use
   it yet — see "Not yet wired" above. Mechanical, do incrementally as you touch those files.
2. **Structured JSON logs via `nestjs-pino`.** Replaces the console logger so every line is JSON
   (`{ requestId, context, level, msg, ... }`), filterable with `jq`/log tooling by `gymId` or
   `requestId`. The correlation model above is designed to carry over unchanged. Moderate change
   (swaps the logger); worthwhile once log volume grows.
3. **Sentry** (also tracked as P2 in `production-readiness.md`). Captures exceptions with stack +
   request context into a dashboard with alerting, tagged with the request id — often the fastest
   path from "a user hit an error" to the root cause. Complements, doesn't replace, the logs.
