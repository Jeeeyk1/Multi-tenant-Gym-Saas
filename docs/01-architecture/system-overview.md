# System Overview

This document describes the high-level architecture of the Gym SaaS platform.

It explains the purpose of each application, the main system boundaries, and the core technical and business principles that shape the codebase.

---

## Platform summary

The platform is a multi-tenant SaaS for gyms and gym organizations.

It supports:
- organization and gym management
- staff and permission management
- members and memberships
- check-ins
- announcements
- future community and AI features

The repository is organized as a monorepo containing web, mobile, API, shared packages, database assets, and engineering documentation.

---

## Primary applications

### Web application
The web application is used by:
- organization owners and org admins (org-level dashboard)
- gym managers, front desk staff, and other gym staff roles

Typical responsibilities:
- organization and gym setup
- gym profile and settings management
- staff management
- membership plan management
- member management
- check-in dashboards
- reports
- billing and subscription management

### Mobile application
The mobile application is used by:
- organization owners and org admins (org-level views on mobile)
- gym staff (operational workflows)
- gym members (primary day-to-day usage)

Typical responsibilities:
- org owner: view branch summaries, key metrics, org-level actions
- staff: member management, check-ins, announcements
- members: check-in, announcements, community chat, AI assistant

Both web and mobile support org-level and gym-level users.
The entry point (org code or gym code) determines which context the session operates in.

### API application
The API is the central backend system and the source of truth for:
- business rules
- authorization rules
- tenant isolation
- persistence workflows
- orchestration across domains
- validation of critical system invariants

All authoritative business decisions must be enforced here.

---

## Core architectural principle

The system is designed so that:

- clients handle presentation and user interaction
- the API owns business logic and persistence rules
- shared packages hold common contracts and reusable code
- database migrations are explicit and reviewable
- documentation acts as a canonical source of engineering truth

This architecture is meant to support fast iteration without allowing uncontrolled code drift.

---

## Monorepo shape

At a high level, the repository contains:

- `apps/web` → Next.js web app
- `apps/mobile` → Expo mobile app
- `apps/api` → NestJS backend
- `packages/*` → shared contracts, SDKs, UI, config, and utilities
- `db/*` → raw SQL migrations, seeds, and DB scripts
- `prisma/*` → Prisma schema and client generation
- `docs/*` → architecture, domains, engineering rules, API conventions, and AI workflow docs

The monorepo allows:
- shared tooling
- shared types/contracts
- consistent dependency management
- easier cross-app refactoring
- centralized documentation and engineering standards

---

## Domain model overview

The system currently centers around these main domains:

- **Identity** → users, tokens, sessions
- **Organization** → tenant root, organization managers
- **Billing** → plans, subscriptions, invoices, feature entitlements
- **Gym** → physical gym branches, gym configuration, schedules
- **Staff & RBAC** → staff assignments, roles, permissions
- **Members** → memberships, enrollment, renewal, privacy
- **Check-ins** → attendance and visit tracking
- **Announcements** → staff-to-member broadcast communication
- **Chat** → future/community communication features
- **AI usage** → token accounting and feature-level AI consumption

These domains are documented separately in domain-specific files.

---

## User tiers and login model

The platform has two distinct user tiers with separate login flows.

### Tier 1 — Organization-level users

Who: owners, co-owners, org admins

Login flow:
1. User enters the organization slug (e.g. `fitlife`)
2. System resolves the organization
3. User enters email and password
4. System validates the user is an `organization_members` record for that org
5. JWT issued with `organizationId` and `orgRole`

Access: full visibility across all gyms in the organization. Billing, gym creation, staff management, cross-branch reports.

### Tier 2 — Gym-level users

Who: gym staff (manager, front desk, trainer) and gym members

Login flow:
1. User enters the gym code (e.g. `FITMNL`)
2. System resolves the gym
3. User enters email and password
4. System validates the user has an account at that specific gym (`gym_staff` or `gym_members`)
5. JWT issued with `gymId`, `roles`, and `permissions`

Access: scoped entirely to the resolved gym. Cannot access other gyms.

### Code resolution endpoint

Before login, both flows call a shared public endpoint:

```
POST /auth/resolve-code   { code: "fitlife" or "FITMNL" }
```

Response:
```json
{ "type": "ORGANIZATION", "name": "Fitlife", "slug": "fitlife" }
{ "type": "GYM", "name": "Fitlife Manila", "code": "FITMNL" }
```

Returns 404 if the code is not found. This drives which login screen the client shows next.

### One account per gym

A user account belongs to one gym (or one organization). There is no cross-gym access from a single account.

If a person works at two separate gyms, they have two separate accounts with two different email addresses. Each account is independent.

---

## Multi-tenancy model

The platform is multi-tenant.

### Tenant root
The tenant root is the **organization**.

Billing, ownership, and top-level subscription state are attached to organizations.

### Operational scope
A single organization may have one or many **gyms**.

Each gym has a unique short `code` used at login (e.g. `FITMNL`). This is the gym's primary identifier for user-facing flows.

Many workflows operate at the gym level:
- staff assignment
- members
- schedules
- announcements
- check-ins
- gym-specific settings

### Security implication
Every gym-scoped operation must enforce tenant boundaries carefully.

Cross-tenant access is a critical failure.

This means:
- queries must include the correct tenant/gym scope
- authenticated context (JWT) must be trusted over request body identifiers for sensitive actions
- role/permission checks must never bypass gym scope validation
- org-level JWT must validate org owns the gym before accessing gym data

---

## Source of truth rules

### API as source of truth
The API is authoritative for:
- permission enforcement
- tenancy validation
- status transitions
- check-in restrictions
- subscription limits
- feature gating
- business workflows involving multiple entities

### Database as source of persisted state
The PostgreSQL database is the persisted source of truth.

Database structure changes are tracked through raw SQL migration files.

### Docs as source of architectural intent
The documentation in this repository defines:
- boundaries
- invariants
- coding expectations
- workflow constraints

The code should align with the documented architecture.

---

## Database strategy

The platform uses PostgreSQL.

The database workflow intentionally combines:
- **raw SQL migrations** for explicit schema history
- **Prisma** for typed database access and schema alignment

### Why this approach
Raw SQL migrations provide:
- clear schema history
- easy review in pull requests
- explicit DB changes for onboarding and deployment
- good control over indexes and constraints

Prisma provides:
- typed DB access
- productivity in application code
- a consistent schema model for development

### Important rule
Schema changes must not exist only in ORM models. They must also exist as SQL migration files.

---

## Application boundaries

### Web
Owns presentation for administrative and operational workflows.

### Mobile
Owns presentation for member-first and selected mobile-first workflows.

### API
Owns:
- domain workflows
- authorization
- transactions
- persistence orchestration
- enforcement of domain invariants

### Shared packages
Own reusable code only when that code is truly shared across applications.

Examples:
- request/response contracts
- shared SDK
- shared config
- selected UI primitives
- generic utilities

Do not move domain logic into shared packages just to make the repo “look reusable.”

---

## Backend architecture direction

The backend is designed around feature-first modules with clear internal layering.

Each feature module should be structured to support:
- presentation
- application
- domain
- infrastructure

This is intended to keep:
- controllers thin
- business logic testable
- persistence details isolated
- dependencies directional and understandable

The backend architecture is documented in more detail in dedicated engineering and backend architecture docs.

---

## Operational principles

### Explicit migrations
All DB schema changes must be represented as SQL files.

### Safe multi-write workflows
Where multiple tables must change together, use transactions.

### Predictable error handling
Business and transport errors should be handled consistently.

### Structured logging
Operationally important actions and errors should be logged in a useful, structured way.

### Incremental delivery
The product is built phase by phase. Architecture should support gradual expansion without requiring major rewrites.

---

## Current implementation priorities

The system is expected to be built incrementally.

The early focus is on the platform foundation:
- monorepo setup
- local development environment
- database workflow
- backend architecture scaffolding
- core domain implementation in small vertical slices

Initial domain priorities are expected to include:
- identity
- organizations
- gyms
- staff and permissions
- membership plans
- members
- renewals
- check-ins

Other domains such as chat and richer AI features can follow after the core workflows are stable.

---

## Design goals

The repository should optimize for:

- clean boundaries
- maintainability
- scalability of both code and team understanding
- safe multi-tenant behavior
- explicit architecture
- AI-assisted development with minimal ambiguity
- fast onboarding for new developers

A good implementation should make it easy for a new engineer to answer:

- where does this feature belong?
- where do business rules live?
- where do DB changes go?
- which app owns this workflow?
- what documentation is canonical for this behavior?

That clarity is one of the main architectural goals.
