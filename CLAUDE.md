# CLAUDE.md

## Purpose

This repository contains the Gym SaaS platform monorepo.

The product includes:
- a **web app** for organization owners, gym managers, and staff
- a **mobile app** for members and selected staff flows
- an **API** that owns business rules, persistence, authorization, and integrations

This file defines how AI should work inside this repository.

---

## Read first

Before making any non-trivial change, read these files in order:

1. `README.md`
2. `docs/01-architecture/system-overview.md`
3. `docs/01-architecture/monorepo-structure.md`
4. `docs/implementation/phases.md` — understand where we are in the build plan
5. Latest file in `docs/progress/` — understand what was last completed and what comes next

Then read only the files relevant to the task.

Examples:
- API/backend task → read app-level API README, relevant engineering/domain docs, and `docs/03-engineering/testing.md`
- Web task → read web README and relevant frontend docs
- Mobile task → read mobile README and relevant mobile docs
- Database task → read DB migration workflow and schema reference docs

Do not scan the whole repository unless the task truly requires it.

---

## Repository truth model

Use this priority when interpreting repository context:

1. **Architecture docs**
2. **Domain docs**
3. **Engineering standards**
4. **App-local README files**
5. **Existing code patterns**

If code conflicts with documented architecture, prefer the documented architecture unless the task explicitly involves fixing outdated docs.

If documentation is missing or ambiguous, state the assumption clearly before implementing.

---

## Project summary

This is a monorepo with:
- `apps/web` → Next.js application
- `apps/mobile` → Expo application
- `apps/api` → NestJS application
- `packages/*` → shared packages
- `db/*` → raw SQL migrations, seeds, and DB scripts
- `prisma/*` → Prisma schema and generated client workflow
- `docs/*` → canonical engineering and product documentation

The API is the source of truth for:
- business rules
- authorization rules
- tenancy boundaries
- persistence rules
- workflows that affect multiple entities

Web and mobile clients must not invent backend business rules.

---

## Core architectural rules

### 1. Respect bounded modules
Code should follow clear business boundaries.

Do not create generic dumping grounds like:
- `helpers/`
- `misc/`
- `shared-business-logic/`
- giant `common/` folders containing domain logic

Shared code must be generic, stable, and truly reusable.

### 2. Keep dependency direction clean
Preferred direction:

- presentation → application → domain
- infrastructure implements application ports
- controllers should not contain business logic
- repositories should not leak transport concerns

Avoid circular dependencies. If a change requires `forwardRef`, stop and reconsider the design.

### 3. Keep controllers thin
Controllers should:
- receive HTTP requests
- validate input
- call use cases / application services
- map responses

Controllers should not:
- implement business rules
- perform complex persistence logic
- contain cross-module orchestration that belongs in application flow

### 4. Prefer use cases over god services
When logic grows, use small focused use-case classes instead of giant service files with many unrelated methods.

### 5. Domain rules belong in the API
Frontend and mobile may enforce UX validation, but backend rules remain authoritative.

Examples:
- tenancy checks
- permission checks
- check-in constraints
- renewal rules
- subscription limits
- feature gating

### 6. Multi-tenancy is non-negotiable
Cross-tenant leaks are critical bugs.

Always scope gym-level data properly.
Never trust tenant-sensitive identifiers from the request body when the authenticated context should define them.

### 7. SQL migrations are required
Database changes must be represented as SQL files in `db/migrations`.

Prisma is used for typed client access and schema alignment, but raw SQL migration files are the migration history.

Do not make schema changes without updating the SQL migration history.

---

## Database rules

### Migration strategy
- Raw SQL files in `db/migrations` are the canonical schema change history.
- Seed SQL files live in `db/seeds`.
- DB scripts in `db/scripts` apply migrations and seeds in order.
- Prisma schema must remain aligned with the actual database schema.

### General DB rules
- Use PostgreSQL conventions already established in the repository.
- Use `uuid` primary keys.
- Use `timestamptz` for timestamps stored in UTC.
- Use `date` where the value is a calendar date rather than a timestamp.
- Prefer explicit indexes for hot query paths.
- Use transactions when multiple writes must succeed together.

### Current important business constraints
- `membership_number` is globally unique.
- `plan_promos` is not part of the initial implementation scope.
- Prevent multiple active check-ins for the same member with a DB-level guard.
- Keep `updated_at` behavior consistent and explicit.

---

## Coding rules

### General
- Prefer explicit and readable code over clever abstractions.
- Keep naming obvious.
- Reuse existing patterns before introducing new ones.
- Make the smallest correct change that satisfies the task.
- Avoid unrelated refactors unless necessary for correctness.

### Backend
- Use feature-first modules.
- Separate presentation, application, domain, and infrastructure concerns.
- Use DTOs for transport validation.
- Use domain/application errors for business failures.
- Use the global exception strategy for consistent API responses.
- Keep Nest-specific framework code at the edges.

### Web and mobile
- Keep UI code focused on presentation and client workflow.
- Do not duplicate backend business rules.
- Consume shared contracts and SDKs where appropriate.
- Keep components and features organized by domain/use case, not random utility grouping.

### Shared packages
- Only place code in `packages/*` if it is truly shared.
- Do not move domain-specific logic into shared packages prematurely.
- Shared contracts must stay consistent with backend behavior.

---

## Task execution rules

For any meaningful task, follow this sequence:

1. Read the required context files.
2. Summarize your understanding.
3. State assumptions and unknowns.
4. List files to be changed.
5. Implement only within the approved scope.
6. Validate the result.
7. Update documentation if behavior or architecture changed.
8. Update the progress log for the current date.

For non-trivial tasks, provide a short implementation plan before writing code.

---

## Progress logging

Every session where meaningful work is done must produce or update a progress entry.

### File location
```
docs/progress/YYYY-MM-DD-progress.md
```

Use today's date. If a file for today already exists, append to it rather than creating a new one.

### What to log
- Which phase or task was worked on
- What was completed
- Key decisions made (and the reasoning)
- Files created or modified
- What was left incomplete or deferred
- What to start with in the next session

### When to write it
- At the end of a meaningful work session
- After any phase milestone is reached
- After any significant architectural decision is made

### Format
Follow the format established in `docs/progress/2026-04-18-progress.md`.

This log exists so that any future session — whether continued by you or a new AI context — can immediately understand where the project stands without re-reading the entire codebase.

---

## Scope control

Do not:
- invent features not described in the repository docs
- create large placeholder modules without need
- introduce new abstractions without clear justification
- rename or restructure major parts of the repository casually
- generate fake sample business code just to “fill out” a structure

Do:
- keep changes incremental
- preserve consistency with existing architecture
- surface ambiguity instead of guessing silently
- leave clear, maintainable code for the next developer

---

## Definition of done

A task is not complete unless all relevant items below are satisfied:

- code is consistent with repository architecture
- types compile
- imports are clean
- no obvious boundary violations were introduced
- DB changes include SQL migration files where required
- Prisma schema is updated if DB structure changed
- tests are added or updated where appropriate
- documentation is updated if behavior, architecture, or workflow changed

---

## When context is unclear

If the repository does not provide enough information to safely implement something:
- do not fabricate hidden requirements
- state what is missing
- make the smallest reasonable assumption
- keep the change narrowly scoped
- avoid encoding speculative business rules into the codebase

---

## Preferred mindset

Optimize for:
- correctness
- clarity
- maintainability
- safe multi-tenant behavior
- small, testable units
- code that the next engineer can extend without confusion
