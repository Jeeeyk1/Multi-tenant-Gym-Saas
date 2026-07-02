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

---

## 10. Frontend data-fetching — adopt TanStack Query

**What:** Both frontends fetch data ad-hoc with no caching, deduping, or background sync.

- **Web** ([apps/web](apps/web)) uses axios via two clients ([src/lib/api.ts](apps/web/src/lib/api.ts) server-side, [src/lib/client-api.ts](apps/web/src/lib/client-api.ts) client-side). Server components fetch directly; client components call server actions which re-fetch. Cache invalidation is `revalidatePath()` only.
- **Mobile** ([apps/mobile](apps/mobile)) uses a `fetch` wrapper ([src/services/api.ts](apps/mobile/src/services/api.ts)) with a custom 401-refresh mutex. Every screen is `useEffect` + `useState` — no cache, no dedupe, no retry, no background refetch.
- ~45 call sites on web, ~50 on mobile. No `@tanstack/react-query` anywhere yet.

**Why it matters:**
- **Mobile re-fetches everything on every screen mount.** No stale-while-revalidate, no shared cache between screens (e.g. `getMyProfile` is called on three different screens with no dedup).
- No optimistic updates → mutations feel sluggish; UI waits for the round-trip.
- Manual `loading` / `error` / `data` triplets in every component — boilerplate and inconsistent error UX.
- Pull-to-refresh on mobile is hand-rolled per screen instead of `refetch()`.
- Server actions on web mean every interactive mutation does a full route revalidate even when only one widget needs to update.

**Important framing — what TanStack Query is and isn't:**
TanStack Query is **not a replacement for axios or fetch**. It's a server-state cache/sync layer that sits on top of whichever HTTP client you already have. The plan below keeps the existing fetchers and adds TanStack Query as the data-fetching state manager. Auth refresh logic stays in the fetcher layer (where it already lives correctly).

**What good looks like — phased migration:**

### Phase 0 — Decisions and conventions (½ day)
- Confirm we keep axios on web and `fetch` wrapper on mobile. Do **not** unify HTTP clients as part of this migration — out of scope, separate decision.
- Agree on a query-key factory convention per resource, e.g.:
  ```ts
  export const memberKeys = {
    all: ['members'] as const,
    detail: (id: string) => [...memberKeys.all, 'detail', id] as const,
    list: (filters: MemberFilters) => [...memberKeys.all, 'list', filters] as const,
  };
  ```
- Agree default `QueryClient` options: `staleTime: 30s`, `gcTime: 5min`, `retry: 1`, `refetchOnWindowFocus: true` (web) / `refetchOnAppFocus: true` (mobile).
- Decide where hooks live: `apps/<app>/src/features/<domain>/hooks/use<Resource>.ts`. Co-located with the feature, not a global `hooks/` dump.

### Phase 1 — Foundation (1 day, mobile first)
- Add `@tanstack/react-query` and `@tanstack/react-query-devtools` to `apps/mobile`.
- Wrap the root with `QueryClientProvider` in [apps/mobile/src/app/_layout.tsx](apps/mobile/src/app/_layout.tsx).
- Wire `AppState` → `focusManager` so RN focus events trigger refetch (standard TanStack Query RN recipe).
- Wire `NetInfo` → `onlineManager` for offline awareness.
- Make sure 401 refresh stays in [src/services/api.ts](apps/mobile/src/services/api.ts) — TanStack Query should never see a 401 (the fetcher handles it transparently). Set `retry: (failureCount, err) => !isAuthError(err)` so we don't loop on truly unauthenticated states.

### Phase 2 — Mobile pilot, two screens (1–2 days)
- Migrate **profile** and **dashboard** screens end-to-end.
- Establish patterns for: `useQuery`, `useMutation` with `onSuccess` invalidation, optimistic updates, pull-to-refresh via `refetch()`, error boundaries.
- Document the patterns in `docs/03-engineering/frontend-data-fetching.md`.

### Phase 3 — Mobile rollout (3–5 days)
- Migrate remaining screens resource-by-resource (auth, member, staff, leaderboard, announcements, chat, workout). One PR per resource — small and reviewable.
- Delete `useEffect`/`useState` data-fetching boilerplate as each resource lands.
- Keep `services/*.ts` as the thin transport layer — they become the function bodies inside `queryFn` / `mutationFn`. Don't merge them into hooks; the separation is useful for testing.

### Phase 4 — Web client components only (2–3 days)
- Add `@tanstack/react-query` to `apps/web` with a per-request `QueryClient` (Next.js App Router recipe — important to avoid cross-request cache leakage).
- **Server components stay as-is.** They already fetch on the server and benefit from Next.js cache; TanStack Query adds nothing there.
- For hybrid pages (server prefetch + interactive client widget): server component calls `queryClient.prefetchQuery(...)`, then wraps the client subtree in `<HydrationBoundary state={dehydrate(queryClient)}>`. Client widget calls `useQuery` with the same key and gets instant data.
- Migrate the most interactive screens first: live check-ins list, chat, plans table. Static dashboards can stay server-rendered.

### Phase 5 — Guardrails and cleanup (½ day)
- Add `@tanstack/eslint-plugin-query` to both apps. Catches missing query keys, exhaustive-deps issues.
- Add a custom lint rule (or PR-review checklist) flagging `useEffect` + `setState({ data })` patterns in `apps/mobile/src/app/**`.
- Remove any now-dead service code, manual loading flags, or one-off cache hacks.
- Update [docs/03-engineering/](docs/03-engineering/) with the final pattern doc and an FAQ section ("when do I use a server component vs `useQuery`?").

**Out of scope for this migration (call out so they don't sneak in):**
- Switching axios → fetch (or vice versa).
- Re-architecting auth/refresh.
- Moving server actions to client-side mutations wholesale (only do this where there's a clear UX win — optimistic update, instant feedback).
- Persisted-cache / offline-first mobile (`@tanstack/query-async-storage-persister`). Worth it later, but a separate effort once the basics land.

**Risks to watch:**
- **SSR hydration mismatches on web** if `staleTime` differs between server prefetch and client mount. The HydrationBoundary recipe solves this; deviate at your peril.
- **React Native `AppState` focus refetch can hammer the API** on cheap reactivations. Tune `staleTime` per query, not globally.
- **401 retry loops** if auth refresh logic isn't carefully bypassed by TanStack Query's retry.
- **Devtools must be tree-shaken from production** builds.

**Effort:** L total, broken into shippable phases:
- Phase 0+1 (mobile foundation): **1.5 days**
- Phase 2 (mobile pilot): **1–2 days**
- Phase 3 (mobile rollout): **3–5 days**
- Phase 4 (web client components): **2–3 days**
- Phase 5 (guardrails + cleanup): **½ day**
- **Realistic total: 8–12 dev-days**, ideally spread across 3–4 PR-sized increments rather than one big-bang merge.
