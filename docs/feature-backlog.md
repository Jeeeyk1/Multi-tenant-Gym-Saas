# Feature Backlog

Active feature work and product polish, separate from `docs/tech-debt.md` (engineering hygiene) and `docs/implementation/phases.md` (original build phases 1–16, all shipped).

Sizes: **XS** < 1 hour · **S** < 1 session · **M** 1–3 sessions · **L** multi-session.

Last updated: 2026-06-27

---

## In progress

_None — last cycle landed cleanly._

---

## Ready to pick up (next)

### Tech-debt #7 — Welcome email never sent (XS, 30 min)
`EmailService.sendWelcome()` exists, never called. Add one call inside the activate-account use case. Trivial polish.

### Staff "award custom badge" mobile UI (S–M)
`POST /badges/award` endpoint already exists. Build the mobile staff screen: member search → custom-badge selector → optional proof note → award. Currently the only way to award custom badges is via the API directly.

### Web staff — Live check-in dashboard (S)
The screen staff stare at all day. Adding polling on active check-ins + clickable "who's in" panel with check-out and member-quicklink actions is the highest daily-use staff win.

### AI suggestion history + favorites (M)
Right now every AI prompt is throwaway — nothing persists. Add a "Saved" tab + `POST /ai/save`. Turns one-shot AI into a re-engagement loop.

---

## Quick-win backlog (XS–S each)

- Tech-debt #5: API URI versioning (`enableVersioning` + `v1` decorators)
- Tech-debt #4: `.env` consolidation
- Tech-debt #8: hash `user_tokens.token` before persistence
- Badges: dedicated "Badge Gallery" tab (deferred — current list is fine until catalog grows)

## Medium backlog

- Tech-debt #6: member activation web page + mobile deep link
- Tech-debt #2: email templates → react-email/MJML
- Tech-debt #1: structured logging (pino + request IDs)
- Member view of another member's profile (no such screen today)

## Large backlog

- Tech-debt #9: meaningful test coverage across use cases — ongoing
- Tech-debt #3: pnpm React-version conflict → workspace separation

---

## Done this week

- **2026-06-26** — TanStack Query migration (mobile, phases 1–3 + 5 guardrails); landing-page polish; web Phase 4 explicitly skipped after survey.
- **2026-06-27** — Two startup-blocking bugs (API DI + mobile silent-refresh URL); membership expiry warning push + member-facing renewal screen; mobile typecheck cleared (three latent staff errors fixed); Badges UX (equip mutation, profile list toggle, leaderboard chip, chat chip, profile header chip); "Who's checked in" + privacy toggle (DB default flipped to hidden, new endpoints, dedicated screen, dashboard card).

---

## Out of scope / not pursuing

- Stripe / external billing — depends on business decision
- Server-side TanStack Query on web — re-open only if a specific screen surfaces a UX pain
- Chat WebSocket → TanStack Query migration — intentional, see TanStack Query Phase 3 notes
