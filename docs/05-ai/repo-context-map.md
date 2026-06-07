
---

# `docs/05-ai/repo-context-map.md`

```md
# Repo Context Map

This file helps AI understand which files to read for different tasks.

Do not load the entire repository context blindly.

---

## Always read first

- README.md
- CLAUDE.md
- docs/01-architecture/system-overview.md

---

## For backend/API tasks

- docs/01-architecture/backend-architecture.md
- docs/01-architecture/multi-tenancy.md
- docs/01-architecture/auth-and-rbac.md
- docs/03-engineering/backend-standards.md
- docs/03-engineering/migration-workflow.md
- apps/api/README.md

---

## For database tasks

- docs/03-engineering/migration-workflow.md
- docs/01-architecture/database-schema-reference.md (if present)
- db/README.md

---

## For web tasks

- docs/00-product/end-to-end-flows.md      ← screen-by-screen flows with exact API calls
- docs/04-api/api-reference.md              ← all REST endpoints + WebSocket protocol
- docs/01-architecture/system-overview.md
- docs/01-architecture/auth-and-rbac.md
- apps/web/README.md

---

## For mobile tasks

- docs/00-product/end-to-end-flows.md      ← screen-by-screen flows with exact API calls
- docs/04-api/api-reference.md              ← all REST endpoints + WebSocket protocol
- docs/01-architecture/system-overview.md
- docs/01-architecture/auth-and-rbac.md
- apps/mobile/README.md

---

## For RBAC tasks

- docs/01-architecture/auth-and-rbac.md
- docs/01-architecture/multi-tenancy.md

---

## For multi-tenant sensitive logic

- docs/01-architecture/multi-tenancy.md

---

## For chat features

- docs/02-domains/community-chat.md
- docs/04-api/api-reference.md  (WebSocket section)

---

## For announcement features

- docs/02-domains/announcements.md
- docs/04-api/api-reference.md  (Announcements section)

---

## For member profile, AI features, onboarding, or notifications

- docs/00-product/member-features.md  ← full specs for all post-MVP member features

---

## For new features

- relevant domain file in docs/02-domains/
- docs/04-api/api-reference.md
- backend architecture doc
- backend standards doc

---

## Rule

Only load:
- relevant domain
- relevant architecture
- relevant engineering rules

Avoid loading:
- unrelated domains
- entire repo docs

---

## Goal

Reduce hallucination by:
- narrowing context
- focusing only on relevant files
- avoiding conflicting information
