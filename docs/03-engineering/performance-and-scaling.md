# Performance & Scaling Plan

**Status:** living backlog — we tackle items one at a time and update the status column.
**Last analysed:** 2026-07-03 (read-only architecture review, no code changed).

---

## 1. Context: the resource envelope and workload

Deployment target (initial): a single **Hetzner CPX31-class** box — **4 vCPU / 8 GB RAM**,
one Postgres, one Redis, one (or a few) Node processes, all on the same host.

Expected scale to plan for: **~20 gym tenants**, **thousands of users** total.

Workload shape (this is half the design input — do not skip it):
- **Read-heavy.** Dashboards, leaderboards, member lists, check-in feeds, announcements.
- **Bursty writes.** Check-ins spike at gym peak hours; renewals/awards are low-volume.
- **Chatty clients.** Mobile + web apps refetch on their own cadence — the clients are a
  load *generator* we control, not just consumers.

---

## 2. How to reason about it (the mental model)

Four moves, in order. This is the transferable skill — the backlog below is just its output.

1. **Characterize the workload, not just the infra.** "4 vCPU / 8 GB" is only half the picture.
   Read-heavy + bursty + chatty clients tells you *where* to aim.
2. **Find the binding constraint** — what runs out first. We have **one shared Postgres** sharing
   8 GB with Node. **DB connections and DB CPU are the scarcest shared resource**; every tenant
   competes for them. Node CPU is rarely the bottleneck for an I/O-bound API.
3. **Prefer removing work over doing work faster.** The cheapest query is the one you never send.
   Caching and client-refetch discipline beat query micro-tuning by an order of magnitude.
4. **Treat the client as part of the system.** Server load = request rate × per-request cost.
   Thousands of apps each refetching on foreground is load you can turn down for free.

**The through-line:** on a small box you scale by *removing work*, not by buying a bigger box.

---

## 3. Binding constraints for this envelope

- **Postgres connections.** Prisma's default pool is `cpu×2+1` ≈ **9 per process**
  (`apps/api/src/common/prisma/prisma.service.ts` sets none). Clustering to use all 4 cores →
  ~36 connections; workable alone, but no headroom and no PgBouncer.
- **DB CPU.** Spent on uncached hot reads and N+1 fan-out.
- **8 GB shared** between Node, Postgres, and Redis. Postgres default config is conservative;
  Node holds WebSocket connections in memory.

---

## 4. Prioritized backlog

Impact/effort are relative. **Order = the sequence in which each will actually bite**:
request *rate* → per-request DB *cost* → connection *ceiling*.

| # | Item | Tier | Impact | Effort | Status |
|---|------|------|--------|--------|--------|
| 2 | Tune client refetch (staleTime / refetchOnWindowFocus) | 1 | High | Low | **Done 2026-07-03** |
| 1 | Redis cache-aside on hot read paths | 1 | High | Med | **Done 2026-07-03** |
| 3 | Fix leaderboard N+1 (cache or single windowed query) | 1 | High | Med | **Done 2026-07-03 (via #1 cache)** |
| 4 | Set Prisma `connection_limit` + decide process model | 1 | High | Low | **Done 2026-07-03** |
| 5 | Response compression (gzip/brotli) | 2 | Med | Low | **Done 2026-07-03** |
| 6 | Trim per-request logging (drop 2xx/health, sample) | 2 | Low | Low | **Done 2026-07-03** |
| 7 | Graceful shutdown (`enableShutdownHooks` + Prisma disconnect) | 2 | Med (reliability) | Low | **Done 2026-07-03** |
| 8 | Index audit for analytics/trend queries | 2 | Med | Low | **Done 2026-07-03** |
| 9 | Cursor pagination for member/large lists | 3 | Med (at scale) | Med | Not started |
| 10 | PgBouncer in front of Postgres | 3 | High (at scale) | Med | Not started |
| 11 | Postgres config tuning for 8 GB | 3 | Med | Low | Not started |
| 12 | Horizontal scale (already WS-ready via Redis IO adapter) | 3 | — | — | Deferred |

---

## 5. Findings in detail (evidence + what to do)

### #2 — Client refetch storm  · Tier 1 · High/Low · ✅ DONE 2026-07-03
**Was:** `apps/mobile/src/lib/query-client.ts` set `staleTime: 30_000` and
`refetchOnWindowFocus: true` globally → every app refetched *all* active queries on every
foreground and every 30s. Web has no client query-client (SSR), so this was mobile-only.
**Done:**
- Global defaults changed to `staleTime: 60_000` (STALE.default) and **`refetchOnWindowFocus: false`**
  — kills the foreground stampede. Added a `STALE` tier constant (`live` 15s / `short` 30s /
  `default` 60s / `static` 10m) in `query-client.ts`.
- **Live views opt back in** (short stale + `refetchOnWindowFocus: true`): `useActiveCheckIns`
  (staff floor), `useActivePublicCheckins` (member "who's here"), `usePendingSubmissions` (staff PR queue).
- **Near-static views set to `STALE.static`**: `useGymPlans`, `useCustomBadges`, `useExercises`
  (leaderboard list), `useLeaderboardConfig`, `useMyProfile`.
- Mutations already invalidate their own queries, so a user's own actions still reflect immediately
  regardless of staleTime — the longer windows only delay seeing *others'* changes.
**Measure next time load-testing:** request rate per client before/after (expect a large drop from
killing focus-refetch), and confirm live views still feel fresh.

### #1 — Application caching  · Tier 1 · High/Med · 🟡 IN PROGRESS (leaderboard done 2026-07-03)
**Was:** `RedisService.getClient()` used only in the AI rate-limiter; Redis otherwise only backed
the WebSocket adapter. Every leaderboard/dashboard/plans/announcements read hit Postgres directly.

**Reusable layer built:** `apps/api/src/common/cache/cache.service.ts` (+ `cache.module.ts`, global).
`CacheService` has `get`/`set`/`del` and a `wrap(key, ttl, compute)` cache-aside helper, and is
**fail-open** — Redis errors degrade to a DB read, never an outage. Unit-tested (hit/miss/fail-open).

**First target — leaderboard board (also closes #3):**
- Read `GetLeaderboardUseCase.getFullLeaderboard` now wraps the board in `cache.wrap(key, 60s, …)`.
  Key + TTL live in `modules/leaderboard/application/leaderboard-cache.ts` (shared by read + writes
  so the key can't drift).
- **Invalidation on every board-mutating write** (the risk area — all three found by tracing writes):
  1. `approve-submission` (PENDING → APPROVED)
  2. `update-leaderboard-config` (enabled exercises / order)
  3. **`submit-pr` when a staff submission is auto-APPROVED** — the non-obvious one; it lands on the
     board without going through `approve-submission`. Missing this would have served a stale board.
- 60s TTL is a safety net so any missed path self-heals within a minute.

**Lesson captured:** cache invalidation risk = *finding every write path that mutates the cached
data*. Grep the writes, don't assume the obvious one is the only one.

**More targets done 2026-07-03 (same `wrap`/`del` pattern, different invalidation strategies —
the strategy should match write frequency + staleness tolerance):**
- **Membership plans** (`plans:{gymId}`) — *explicit invalidation* on create/update. gymId on both
  sides, clean. Managers want plans to update immediately after an edit.
- **resolve-code / gym theme** (`resolve-code:{code}`, 60s) — *TTL-only, no explicit invalidation*.
  The read is keyed by code but the write (`update-gym-profile`) is by gymId — a mismatch — and
  branding changes are rare, so 60s of staleness is fine. NotFound throws → unknown codes aren't
  cached (no negative-cache pollution).
- **Active announcements** (`announcements:published:{gymId}`, 60s) — cache *only* the members'
  PUBLISHED list (the hot path); manager filtered views stay uncached. Explicit invalidation on
  create/update/archive; the publisher **cron** flipping scheduled→published is covered by the TTL
  (self-heals within 60s) rather than cron-side invalidation.

Reusable `CacheService.wrap`/`del` made each of these a ~2-line change plus a shared key helper.
Constructor injection meant updating 6 write-use-case specs' mocks (mock-completeness rule).

**Verify next time on the box:** for each, hit the read twice (2nd should be a cache read via
`redis-cli MONITOR`), then do the corresponding write and confirm the list refreshes (immediately
for plans/announcements; within 60s for gym theme).

### #3 — Leaderboard N+1  · Tier 1 · High/Med
**Evidence:** `apps/api/src/modules/leaderboard/infrastructure/persistence/leaderboard.repository.ts`
→ `getFullLeaderboard` fetches enabled exercises, then `Promise.all`s `getExerciseLeaderboard`
(a `groupBy`) **per exercise**.
**Problem:** 20 enabled exercises = 21 queries per board load; × concurrent users × 20 gyms →
connection-pool pressure.
**Direction:** either cache the assembled board (pairs with #1), or collapse to one windowed query
(`ROW_NUMBER() OVER (PARTITION BY exercise ORDER BY est_1rm DESC)`), or both.

### #4 — Prisma pool + process model  · Tier 1 · High/Low · ✅ DONE 2026-07-03
**Context found:** `node dist/main` = single process; `docker-compose.yml` runs only Postgres +
Redis, so the box is **all-in-one** (PG + Redis + Node share 4 vCPU / 8 GB). The app is already
**cluster-safe**: crons acquire a Redis lock (`cron/shared/cron-lock.service.ts`) and WebSockets use
the Redis IO adapter — nothing duplicates across workers.

**Decision — 2 PM2 cluster workers.** The key insight: on an all-in-one box, Postgres shares the
cores, and it *is* the bottleneck. So we deliberately do **not** let Node take all 4 cores.
- 1 worker → a bcrypt login / heavy serialization blocks the whole event loop; no redundancy.
- 4 workers → Node starves Postgres; worse overall.
- **2 workers** → survives a crash, keeps CPU bursts from freezing everyone, leaves ~2 cores for
  Postgres/Redis/OS. Right split for co-tenancy.

**Config done:**
- `apps/api/ecosystem.config.js` — PM2 cluster (`instances: 2`, `max_memory_restart: 900M`).
  Run `pm2 start ecosystem.config.js` after `pnpm build`.
- `.env.example` DATABASE_URL now documents pool params:
  `?connection_limit=10&pool_timeout=15&connect_timeout=10`. **Per worker.** 2 × 10 = 20 connections
  vs Postgres `max_connections=100` (default, plenty of headroom; ~200 MB PG connection memory).
  Set these on the production `.env` (not local — local runs a single watch process; default pool is fine).

**When to change (documented triggers):**
- Postgres CPU saturates → split PG onto its own box, *then* raise workers (2→4) or scale out
  (already WS-ready via the Redis adapter).
- Connections bind before CPU → PgBouncer (#10).
- Postgres 8 GB tuning is separate (#11); `max_connections=100` default is fine for now.

### #5 — Response compression  · Tier 2 · ✅ DONE 2026-07-03
Added `compression()` in `apps/api/src/main.ts` (installed `compression` + `@types/compression`).
gzip on JSON responses — bandwidth + mobile parse win at trivial CPU. Default import required
(`import compression from 'compression'`), not `import * as`.

### #6 — Per-request logging  · Tier 2 · ✅ DONE 2026-07-03
`logging.interceptor.ts` now: never logs `/health` probes; in **production** logs only requests
≥ 500ms (as `SLOW …` warn); in dev logs everything. Cuts prod per-request log volume to near-zero
while surfacing slow endpoints.

### #7 — Graceful shutdown  · Tier 2 · ✅ DONE 2026-07-03
`main.ts` calls `app.enableShutdownHooks()`; `PrismaService` implements `OnModuleDestroy` →
`$disconnect()` (RedisService already had `onModuleDestroy`). SIGTERM/SIGINT now drains in-flight
requests and releases DB/Redis connections cleanly on deploy/restart.

### #8 — Index audit  · Tier 2 · ✅ DONE 2026-07-03
Audited the new analytics/list queries against `pg_indexes`. Already covered (no action):
`idx_pr_submissions_leaderboard` (perfect partial match for the leaderboard groupBy) and
`idx_ai_usage_org_date` (AI quota sum). **Gaps fixed in `db/migrations/0038_perf_indexes.sql`:**
- `check_ins (gym_id, checked_in_at)` — trend/metrics (existing active index is partial, can't serve it).
- `gym_members (gym_id, joined_at DESC)` — member list order + new-member trend.
- `gym_members (gym_id, status)` — active/expired/suspended counts.
- `membership_renewals (member_id, renewed_at DESC)` — renewals had **only a pkey**, so the revenue-trend
  FK join was a seq scan. Biggest win.
Indexes kept in raw SQL only (consistent with how these tables' existing indexes are managed;
raw SQL is the source of truth). On large production tables use `CREATE INDEX CONCURRENTLY`.

### #9 — Offset pagination  · Tier 3
**Evidence:** `apps/api/src/modules/members/infrastructure/persistence/members.repository.ts:123`
uses `skip`/`take`. Deep offsets scan+discard rows; degrades on large tenants. Move to cursor
(keyset) pagination when a gym's lists get big.

### #10-12 — Scale-out levers (later)
- **PgBouncer** (transaction pooling) once connections bind — lets many app workers share few PG
  connections.
- **Postgres config** for 8 GB: `shared_buffers` ≈ 2 GB, tuned `work_mem`, `effective_cache_size`,
  `max_connections` sized to the pooling strategy.
- **Horizontal scale** is already unlocked — the WebSocket layer uses the Redis IO adapter
  (`apps/api/src/common/adapters/redis-io.adapter.ts`), so multiple API instances can coordinate.

---

## 6. Execution notes

- Tackle **top-down** (#2 → #1 → #3 → #4), re-measuring after each. Attack request *rate* before
  per-request *cost* before the connection *ceiling* — the order they bite.
- Prefer changes that **remove work** (cache, refetch discipline) over changes that do work faster.
- Each item should ship with a before/after measurement where feasible (query counts, p95 latency,
  DB connection high-water mark). "Faster" is a claim; a number is evidence.
