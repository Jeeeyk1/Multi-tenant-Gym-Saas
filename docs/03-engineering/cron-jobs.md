# Cron Job Architecture

This document defines how background scheduled jobs are designed, structured, and executed in the Gym SaaS platform.

---

## Guiding principles

### 1. One class, one job
Each cron job is a dedicated class with a single responsibility. Do not combine multiple scheduled tasks into one class or method.

### 2. Idempotent
Every job must be safe to run multiple times without producing incorrect results. If a job runs twice due to a clock drift or restart, data must remain consistent.

### 3. Batched processing
Jobs must never load an unbounded result set into memory. Process records in fixed-size batches (default: 100). Loop until no more records remain.

### 4. Distributed lock
Because the API may run as multiple instances (horizontal scaling), each job must acquire a Redis lock before executing. If the lock is already held by another instance, the job skips silently. This prevents duplicate execution.

### 5. Structured logging
Each job logs:
- when it starts
- how many records it processed
- how long it took
- any errors encountered (without crashing the process)

### 6. Failure-isolated
A failure in one job must never affect another job. Use try/catch per job. Log and continue.

### 7. Configurable schedules
Cron expressions are defined in configuration, not hardcoded in the job class. This allows schedule changes without code changes.

---

## File structure

```
src/
  cron/
    cron.module.ts              ← registers all jobs and shared services
    shared/
      cron-lock.service.ts      ← Redis distributed lock abstraction
    jobs/
      membership-expiry.job.ts  ← ACTIVE → EXPIRED
      auto-suspend.job.ts       ← EXPIRED → SUSPENDED after threshold
      auto-checkout.job.ts      ← closes stale open check-ins
      announcement-publisher.job.ts ← publish scheduled / expire old announcements
```

---

## Distributed lock design

Uses Redis `SET key value NX EX seconds`:
- `NX` — only sets the key if it does not already exist (atomic)
- `EX` — auto-expires the lock after a TTL even if the process crashes

The lock TTL must be longer than the maximum expected job duration.

```
CronLockService.withLock(key, ttlSeconds, async () => {
  // job logic here
})
```

If the lock cannot be acquired, the job logs a skip message and returns immediately. No error is thrown.

Lock key naming convention:
```
lock:cron:<job-name>
e.g. lock:cron:auto-checkout
     lock:cron:membership-expiry
```

---

## Defined jobs

### 1. MembershipExpiryJob

**Purpose:** Transition members from `ACTIVE` to `EXPIRED` when their `expiry_date` has passed.

**Schedule:** Daily at `01:00` (server UTC)

**Lock TTL:** 5 minutes

**Logic:**
1. Acquire lock
2. Query `gym_members` where `status = 'ACTIVE'` AND `expiry_date < today`
3. Process in batches of 100
4. Update `status = 'EXPIRED'` for each batch
5. Log total count
6. Release lock

**Idempotency:** Safe. A record already `EXPIRED` will not match the query.

---

### 2. AutoSuspendJob

**Purpose:** Transition members from `EXPIRED` to `SUSPENDED` after the gym-configured inactivity threshold (default: 3 months).

**Schedule:** Daily at `02:00` (server UTC)

**Lock TTL:** 5 minutes

**Logic:**
1. Acquire lock
2. Query `gym_members` joined with `gyms` where:
   - `status = 'EXPIRED'`
   - `expiry_date < now() - (gym.auto_suspend_months months)`
3. Process in batches of 100
4. Update `status = 'SUSPENDED'`
5. Log total count per gym
6. Release lock

**Idempotency:** Safe. Already `SUSPENDED` members will not match the query.

**Config dependency:** `gyms.auto_suspend_months` (default: `3`)

---

### 3. AutoCheckoutJob

**Purpose:** Close stale open check-ins where the member has exceeded the gym's auto-checkout threshold without checking out.

**Schedule:** Every `15 minutes`

**Lock TTL:** 10 minutes

**Logic:**
1. Acquire lock
2. Query `check_ins` joined with `gyms` where:
   - `checked_out_at IS NULL`
   - `checked_in_at < now() - (gym.auto_checkout_hours hours)`
3. Process in batches of 100
4. Set `checked_out_at = now()`, `is_auto_checkout = true`
5. Log total count
6. Release lock

**Idempotency:** Safe. Closed check-ins (`checked_out_at IS NOT NULL`) will not match the query.

**Config dependency:** `gyms.auto_checkout_hours` (default: `5`)

**Note:** At check-in time, the application also handles the case where a member attempts to check in with an open stale session. The cron job ensures records are cleaned up proactively, but the check-in flow has a runtime safety net.

---

### 4. AnnouncementPublisherJob

**Purpose:** Publish scheduled announcements and expire outdated ones.

**Schedule:** Every `5 minutes`

**Lock TTL:** 2 minutes

**Logic:**
1. Acquire lock
2. Publish: update `status = 'PUBLISHED'` where `status = 'SCHEDULED'` AND `publish_at <= now()`
3. Expire: update `status = 'EXPIRED'` where `status = 'PUBLISHED'` AND `expires_at <= now()` AND `expires_at IS NOT NULL`
4. Log counts for each operation
5. Release lock

**Idempotency:** Safe. Status transitions are one-directional and filter by current status.

---

## Adding a new cron job

Follow this checklist:

1. Create `src/cron/jobs/<name>.job.ts`
2. Give it a single `@Cron()` decorated method
3. Acquire a Redis lock at the start with a unique key
4. Process in batches of 100
5. Log start, completion, and record count
6. Handle errors with try/catch — never let a job crash the process
7. Register the class in `cron.module.ts`
8. Define the cron expression in `config/` not in the job class
9. Document it in this file under "Defined jobs"

---

## Cron expression reference

| Job | Schedule | Expression |
|---|---|---|
| MembershipExpiryJob | Daily at 01:00 UTC | `0 1 * * *` |
| AutoSuspendJob | Daily at 02:00 UTC | `0 2 * * *` |
| AutoCheckoutJob | Every 15 minutes | `*/15 * * * *` |
| AnnouncementPublisherJob | Every 5 minutes | `*/5 * * * *` |

---

## Logging format

Each job should produce structured log entries:

```
[MembershipExpiryJob] started
[MembershipExpiryJob] processed 43 records in 1204ms
[MembershipExpiryJob] completed

[AutoCheckoutJob] lock already held — skipping
```

Use the NestJS `Logger` class. Do not use `console.log` in job code.

---

## Failure handling

- Catch all errors inside the job body
- Log the error with context (job name, batch index, error message)
- Do not rethrow — let the job complete its cycle
- If a batch fails, log it and continue to the next batch where possible
- Failures are visible in logs and can be alerted on via log monitoring

---

## Scaling considerations

- The distributed lock pattern means any number of API instances can run without duplicate job execution
- Lock TTL acts as a dead-man's switch: if the process crashes mid-job, the lock expires and another instance can run it on the next cycle
- Batch size of 100 is conservative — increase only with profiling evidence
- Jobs that interact with gym-scoped data (AutoSuspendJob, AutoCheckoutJob) may be good candidates for per-gym parallelism in the future if processing time grows significantly
