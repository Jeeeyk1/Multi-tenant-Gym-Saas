# TanStack Query Migration — Status Tracker

Single source of truth for where we are in the frontend data-fetching migration.
High-level plan and rationale live in [tech-debt.md #10](../tech-debt.md#10-frontend-data-fetchingadopt-tanstack-query) — this file tracks **execution status, decisions, and open questions**.

---

## Current status

**Phase:** 5 complete. Migration done. Phase 4 (web) **explicitly skipped** — see Phase 4 section.
**Started:** 2026-06-26
**Completed:** 2026-06-27
**Owner:** —
**Next action:** None. Re-open Phase 4 only when a specific web screen surfaces a UX pain TanStack Query would solve.

---

## Why we started here

- **Mobile first**, web second. Mobile has zero caching today (`useEffect` + `useState` on every screen) — every refactored screen is an immediate UX win. Web is mostly server components where TanStack Query adds no value, so we delay it.
- **Phase 0 (decisions) before Phase 1 (code)** — locking conventions now is cheap; retrofitting query-key shapes across 50 hooks later is not.
- **Foundation before pilot before rollout** — three separate PRs, each independently revertible. Avoids a big-bang merge.

---

## Phase checklist

### Phase 0 — Decisions and conventions ✅
- [x] Confirmed: keep axios on web, `fetch` wrapper on mobile (HTTP-client unification is out of scope for this migration).
- [x] Confirmed query-key factory convention (see "Decisions" below).
- [x] Confirmed `QueryClient` default options (see "Decisions" below).
- [x] Confirmed hook file location: flat `apps/mobile/src/hooks/<resource>.ts`.
- [x] Confirmed `services/*.ts` on mobile stays as transport layer (they become the body of `queryFn`/`mutationFn`).

### Phase 1 — Mobile foundation
- [x] Add `@tanstack/react-query` to `apps/mobile/package.json`. (Devtools deferred — RN needs `@dev-plugins/react-query`, separate decision.)
- [x] Create `apps/mobile/src/lib/query-client.ts` exporting a configured `QueryClient` + focus manager setup.
- [x] Wrap root in `<QueryClientProvider>` in `apps/mobile/src/app/_layout.tsx`.
- [x] Wire React Native `AppState` → `focusManager` (RN focus refetch).
- [ ] Wire `@react-native-community/netinfo` → `onlineManager`. **Deferred** — package not installed; default RN behavior (treat as always online) is acceptable for Phase 1. Add in a follow-up PR if/when offline support matters.
- [x] 401 refresh in `apps/mobile/src/services/api.ts` left untouched — TanStack Query only sees a 401 when refresh has already failed (session truly expired).
- [x] `retry: (count, err) => count < 1 && !isAuthError(err)` so we don't loop on hard-unauth.
- [ ] Devtools — deferred to a separate small PR (Expo plugin `@dev-plugins/react-query`, or Reactotron — TBD).
- [ ] **User action: run `pnpm install` from repo root.**
- [ ] **User action: smoke-test app boots (`pnpm --filter @gym-saas/mobile dev`).**

### Phase 2 — Mobile pilot (two screens)
- [x] Created `apps/mobile/src/hooks/members.ts` — `memberKeys` factory + `useMyMember`, `useMyProfile`, `useMyBadges`, `useMyCheckIns`, `useUpdateMyProfile`.
- [x] Migrated profile screen (`apps/mobile/src/app/(member)/profile.tsx`) — three queries + `useUpdateMyProfile` mutation; modal now owns its own mutation, parent no longer threads `gymId` / `onSaved`.
- [x] Migrated dashboard screen (`apps/mobile/src/app/(member)/dashboard.tsx`) — two queries; pull-to-refresh uses `refetch()` + `isRefetching`. Shared `getMyMember` is now deduped across the two screens.
- [x] Wrote `docs/03-engineering/frontend-data-fetching.md` with the locked-in patterns.
- [ ] **User action: smoke-test profile + dashboard.** Confirm initial load, pull-to-refresh, edit profile save flow, and that switching between dashboard and profile doesn't re-fetch the member (cache hit).

### Phase 3 — Mobile rollout
- [x] **Auth** — intentionally not migrated. Login / refresh / logout are command-style operations owned by `AuthContext`; they don't benefit from TanStack Query caching.
- [x] **Members** — `src/hooks/members.ts`. Hooks: `useMyMember`, `useMyProfile`, `useMyBadges`, `useMyCheckIns`, `useSelfCheckIn`, `useUpdateMyProfile`. Used by: profile, dashboard, checkin, index, onboarding, ai.
- [x] **Staff** — `src/hooks/staff.ts`. Hooks: `useActiveCheckIns`, `useStaffMembers`, `useStaffMember`, `useStaffRenewals`, `useStaffAnnouncements`, `useCheckInManual`, `useCheckInQrScan`, `useCheckOut`, `useSuspendMember`, `useReactivateMember`, `useRenewMembership`, `useCreateStaffAnnouncement`, `useArchiveStaffAnnouncement`. Used by: staff dashboard, checkins, members, member detail, announcements.
- [x] **Leaderboard** — `src/hooks/leaderboard.ts`. Hooks: `useLeaderboard`, `useExercises`, `useMyPrs`, `useUploadLeaderboardPhoto`, `useSubmitPr`, `usePendingSubmissions`, `useLeaderboardConfig`, `useApproveSubmission`, `useRejectSubmission`, `useUpdateLeaderboardConfig`. Used by: member leaderboard, staff leaderboard.
- [x] **Announcements** — `src/hooks/announcements.ts`. Hooks: `useAnnouncements`, `useMarkAnnouncementRead` (optimistic with rollback). Used by: member announcements.
- [x] **Workout** — `src/hooks/workouts.ts`. Hooks: `useWorkoutSessions` (infinite query), `useLogWorkoutSession`. Used by: workout-history, train, workout.
- [x] **Chat** — intentionally not migrated. Messages are WebSocket-driven (socket.io); the two HTTP calls (`getDefaultConversation`, `getMessages`) seed initial state once per session and never refetch. Forcing them into TanStack Query would either let stale cache fight live WS events or require cache merging on every event. Not worth the complexity. See `docs/03-engineering/frontend-data-fetching.md` for the rule of thumb.
- [x] All `useEffect` + `useState` data-loaders removed across migrated screens.

### Phase 4 — Web client components — **SKIPPED (2026-06-26)**

Decision after surveying `apps/web`:

- **Zero client components fetch data directly today.** All ~45 `api.*` call sites live in server components (pages) or server actions. `apps/web/src/lib/client-api.ts` exists but is never imported.
- Mutations use server actions + `revalidatePath()`. That's a valid (and idiomatic) Next.js App Router pattern.
- Adding TanStack Query on top would only help where a screen has a specific UX win (optimistic mutations, polling, cross-component cache sharing). No such pain point has been raised.

**Re-open Phase 4 only when:**
- A specific screen surfaces sluggish-mutation feedback that `revalidatePath()` can't fix.
- We want client-side polling / background refetch on a widget (e.g. live check-ins list auto-refreshing every N seconds).
- Chat-feed wants to share message cache across instances.

When that happens, cherry-pick the candidate, add `@tanstack/react-query` to `apps/web` with a **per-request** `QueryClient`, and follow the same patterns as mobile. Don't migrate the whole app for symmetry.

### Phase 5 — Guardrails and cleanup ✅
- [x] `@tanstack/eslint-plugin-query` added to `apps/mobile` (recommended ruleset enabled).
- [x] `eslint-plugin-react-hooks` added — `rules-of-hooks: error`, `exhaustive-deps: warn`.
- [x] Custom `no-restricted-syntax` rule warns on `useEffect(() => { ... setData(x) ... })` patterns that re-introduce the old data-fetching shape. Warn-level so legit animation/form effects aren't blocked.
- [x] `no-console: error` enforced in mobile source. Chat screen has a file-level disable for intentional WebSocket debug logging.
- [x] Cleaned up dead code surfaced by the lint pass: unused imports (`GymMember`, `useEffect`, `useTheme`), unused locals (`selectedExercise`, `photoUrl`, `theme`), bare `catch {}` clarified, destructure renamed to `[, items]`.
- [x] No leftover service-level caching hacks found — confirmed via grep.
- [ ] Web-side patterns FAQ in `docs/03-engineering/frontend-data-fetching.md` — deferred until/unless Phase 4 is re-opened.

---

## Decisions

> All confirmed 2026-06-26.

### D1 — HTTP clients stay as they are
- Mobile keeps `fetch` wrapper at [apps/mobile/src/services/api.ts](../../apps/mobile/src/services/api.ts).
- Web keeps axios via [apps/web/src/lib/api.ts](../../apps/web/src/lib/api.ts) + [apps/web/src/lib/client-api.ts](../../apps/web/src/lib/client-api.ts).
- TanStack Query sits on top; it does not replace either client.

### D2 — Query key factory per resource
```ts
// apps/mobile/src/features/members/hooks/keys.ts
export const memberKeys = {
  all: ['members'] as const,
  detail: (id: string) => [...memberKeys.all, 'detail', id] as const,
  list:   (filters: MemberFilters) => [...memberKeys.all, 'list', filters] as const,
};
```
Always a `const` factory, always tuples with `as const`, always namespaced under the resource root for easy bulk invalidation.

### D3 — Default `QueryClient` options
```ts
new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,         // 30s — most data is fine for 30s
      gcTime:    5 * 60 * 1000,     // 5min cache retention
      retry:     (count, err) => count < 1 && !isAuthError(err),
      refetchOnWindowFocus: true,   // overridden per-query if too aggressive
    },
    mutations: {
      retry: false,                  // mutations never auto-retry
    },
  },
})
```
`staleTime` is tuned **per-query**, not globally — chat messages might want 5s, gym list might want 5min.

### D4 — Hook location and naming
- Location: flat `apps/mobile/src/hooks/<resource>.ts` (matches existing flat layout — no new `features/` convention).
- One file per resource, e.g. `src/hooks/members.ts` exports `useMember`, `useMembersList`, `useUpdateMember`.
- Mutations always return the full `useMutation` result; never wrap it in a custom shape.

### D5 — Services stay
`apps/mobile/src/services/*.ts` are kept as the thin transport layer. Hooks call them as `queryFn` / `mutationFn`. Don't inline `fetch` in hooks — the separation is useful for testing and keeps URL/payload shape in one place.

### D6 — Auth refresh stays in the fetcher
401 refresh logic in `apps/mobile/src/services/api.ts` is untouched. TanStack Query must never observe a 401 from a refreshable session. `retry` predicate explicitly skips auth errors so we don't loop on hard-unauth.

---

## Open questions

- [ ] Do we want a persisted query cache on mobile (offline support via `@tanstack/query-async-storage-persister`)? **Parked** — separate effort after Phase 3 lands.
- [ ] Web: do we keep server actions for mutations, or migrate interactive mutations to client-side `useMutation`? **Decide during Phase 4.** Default: only migrate where there's a clear UX win (optimistic update, instant feedback).
- [ ] Should we standardize error shape across both apps before migrating? Probably not — would expand scope. Adapt to current error shapes per app.

---

## Out of scope (do not let these creep in)

- Switching axios → fetch or vice versa.
- Re-architecting auth / refresh flow.
- Wholesale conversion of server actions to client mutations.
- Persisted/offline-first mobile cache.
- Unifying the web's dual HTTP clients (`api.ts` vs `client-api.ts`).

---

## Change log

| Date       | Phase | Note |
|------------|-------|------|
| 2026-06-26 | 0     | Tracker created. Audit complete. Awaiting confirmation of D1–D6 to start Phase 1 PR. |
| 2026-06-26 | 0→1   | D1–D6 confirmed. Phase 1 foundation landed: `@tanstack/react-query` added to `apps/mobile/package.json`, `src/lib/query-client.ts` created, `_layout.tsx` wraps tree in `<QueryClientProvider>`, RN `AppState`→`focusManager` wired. NetInfo + devtools deferred. |
| 2026-06-26 | 1→2   | Phase 2 pilot landed: `src/hooks/members.ts` (members resource hooks), profile + dashboard screens migrated, patterns doc `docs/03-engineering/frontend-data-fetching.md` written. Mutation hook owns cache update via `setQueryData`. Awaiting user smoke-test before Phase 3. |
| 2026-06-26 | 2→3   | Phase 3 mobile rollout effectively complete in one session: announcements, leaderboard (member + staff), workout, staff resource hook files created; ~14 screens migrated end-to-end. Auth and chat intentionally not migrated (rationale recorded in checklist). Workout history uses `useInfiniteQuery`. All `useEffect`/`useState` data-loaders removed from migrated screens. Awaiting smoke-test. |
| 2026-06-26 | 4 ❌   | Phase 4 (web) **skipped after survey**. No client components fetch data on web; SSR + server-actions + `revalidatePath()` is the existing pattern and works fine. Re-open only when a specific screen surfaces a UX pain TanStack Query would actually solve. |
| 2026-06-27 | 5     | Phase 5 guardrails landed. Mobile gets `.eslintrc.js` with `@tanstack/query` recommended ruleset, `react-hooks`, `no-console: error`, and a custom `no-restricted-syntax` warn against `useEffect + setData(x)` patterns. Lint pass surfaced and cleaned ~10 unused imports/locals. End-to-end smoke-test passed before this work. |