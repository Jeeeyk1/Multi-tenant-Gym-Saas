# Billing & Subscriptions — Design + Phase Plan

**Status:** design agreed 2026-07-03, not yet built. Manual payments first; automated gateway later.
**Decisions locked with the owner:** pay-first activation · landing = lead capture · payment proof =
reference number only (no screenshot).

---

## 1. Where we are today (grounding)

- `admin/create-gym-client.use-case.ts` already provisions the full stack in one transaction:
  Organization + Gym + profile + schedules + community conversation + owner `User` (created
  `isActive: true`) + `OrganizationMember(OWNER)` + `GymStaff` with the `OWNER` role + an
  **invite token**. Provisioning works.
- `Subscription`, `Invoice`, `Plan`, `PlanFeature` tables exist. **Nothing writes to Subscription or
  Invoice** — they sit empty. (This is why a provisioned gym has no plan/entitlement until a row is
  inserted by hand.)
- Admin can CRUD plans. `ai-insights` *reads* subscription for entitlement/quota.

So this is not a "payment integration" gap — it's a **billing layer that was never built** on top of a
working provisioning flow. Good: the recommendation is clean.

---

## 2. The load-bearing principle

**Decouple "payment happened" from "subscription is active."** There is one internal event —
*an invoice was marked paid* — that activates/extends a subscription. It can be fired by:

- **now (manual):** an admin clicks "Verify payment"
- **later (automated):** a PayMongo/Xendit webhook POSTs the API

Build the manual flow, but route it through a single `MarkInvoicePaidUseCase` that both the admin
action and a future webhook call. Everything downstream (activate, extend period, generate next
invoice, suspend on non-payment) never knows which one confirmed the money. Adding a gateway later is
then a **new trigger for existing logic**, not a rewrite.

> The account question answered: there is no "signup before subscribe" gap. `createGymClient` already
> creates the owner account (active, no password) + invite token. The invite link is "claim your
> pre-created account (set password)", not "sign up". You create the account; they claim it.

---

## 3. State machines

**Subscription.status**
```
PENDING_PAYMENT → ACTIVE → PAST_DUE → SUSPENDED
                     ↑         |
                     └─────────┘ (payment clears)
ACTIVE/PAST_DUE → CANCELLED (owner/admin ends it)
```
- `PENDING_PAYMENT` — provisioned, first invoice unpaid. **Gym is locked** (pay-first).
- `ACTIVE` — paid, current. Full access.
- `PAST_DUE` — renewal invoice unpaid past period end; grace window before suspend.
- `SUSPENDED` — grace elapsed. Gym locked. Reactivate on payment.
- `CANCELLED` — terminal.

**Invoice.status**
```
OPEN → AWAITING_VERIFICATION → PAID
  ↑            |
  └── REJECTED ┘  (admin rejects the submitted reference; owner resubmits)
OPEN/AWAITING → VOID (admin cancels the invoice)
```
- `OPEN` — issued, unpaid, has `dueAt`.
- `AWAITING_VERIFICATION` — owner submitted a payment reference; awaiting admin check.
- `PAID` — admin (or future webhook) confirmed. Sets `paidAt`, fires activation.
- `REJECTED` — reference didn't check out; back to OPEN with a reason.
- `VOID` — cancelled (e.g. plan change, duplicate).

---

## 4. Data model changes

Existing `Invoice` has: amount, currency (PHP), paymentMethod, lineItems, paidAt, dueAt, status.

Add (migration):
- `Invoice.payment_reference` (text, nullable) — the GCash/bank reference the owner submits.
- `Invoice.payment_submitted_at` (timestamptz, nullable).
- `Invoice.verified_by` (uuid, nullable → system admin user).
- `Invoice.rejection_reason` (text, nullable).

New table `signup_requests` (lead capture):
- id, gym_name, owner_name, email, phone, plan_id (nullable), status
  (`NEW | CONTACTED | CONVERTED | REJECTED`), notes, created_at.

`Subscription` already has status/billingCycle/currentPeriodStart/End/aiTokensUsed — reuse. Align
`status` values to §3 (drop the `TRIALING` default → `PENDING_PAYMENT` at creation).

---

## 5. Enforcement — the "pay-first lock"

A gym is only usable when its org subscription is `ACTIVE`. Enforce with a guard on gym-scoped
endpoints returning **HTTP 402** `SUBSCRIPTION_INACTIVE` when it isn't.

- **Whitelisted (allowed while inactive):** auth/login/logout, resolve-code, the owner's
  subscription-status + open-invoice read, and submit-payment. Mark these with an
  `@AllowInactiveSubscription()` decorator.
- Clients catch 402 → route to the payment screen. Owner (web) can still log in and pay; staff/members
  (and mobile) see "subscription inactive" until it clears.
- **Cache the status check** (`subscription:status:{orgId}`, short TTL, invalidate on status change) —
  reuses the `CacheService` from the perf work so this guard isn't a per-request DB hit.

---

## 6. The two acquisition flows

### Flow A — Admin-initiated (primary, sales-led)
1. Admin "New Client": gym/org details, owner email, **+ pick plan + billing cycle**.
2. Extend `createGymClient` (same transaction): create `Subscription (PENDING_PAYMENT)` +
   first `Invoice (OPEN, amount = plan price, dueAt = now + N days)`.
3. Send invite. Owner claims account (sets password).
4. Owner logs in → `PENDING_PAYMENT` → lands on **payment screen**: the open invoice + instructions
   (static GCash QR / bank details, configurable) + "I've paid — submit reference" form.
5. Owner submits `{ reference, amount, date, method }` → invoice `AWAITING_VERIFICATION`.
6. Admin **Pending Payments** queue → cross-checks GCash → Approve → `MarkInvoicePaidUseCase` →
   invoice `PAID` + subscription `ACTIVE` → gym unlocks. (Reject → OPEN + reason → owner resubmits.)

### Flow B — Landing "Subscribe" (lead capture)
1. Landing pricing → Subscribe → form (gym, owner, email, phone, plan) → public rate-limited
   `POST /public/signup-requests` → `SignupRequest(NEW)`.
2. Admin **Signup Requests** queue → contact → **Convert** → runs Flow A → marks `CONVERTED`.

At ~20 clients, high-touch is correct. No self-serve checkout is built.

### Renewals (cron, reuse existing job pattern)
- ~7 days before `currentPeriodEnd`: generate next `Invoice(OPEN)` + email reminder.
- Period end unpaid → `PAST_DUE`; grace (N days) elapsed unpaid → `SUSPENDED` (locked).
- Payment clears at any point → back to `ACTIVE`, period extended.

---

## 7. Migration path to automated payments (later, no rewrite)

When ready: integrate **PayMongo or Xendit** (both do GCash + QR Ph + cards in PH, webhook-based,
~2.5–3.5% e-wallet fees).
- Create a payment intent per `OPEN` invoice → their **dynamic QR / hosted checkout**.
- Their webhook → `POST /webhooks/payments/:provider` → verify signature → find invoice →
  call the **same** `MarkInvoicePaidUseCase`.
- Zero change to subscription logic. Manual verification stays as a fallback.

---

## 8. Phase plan

| Phase | Scope | Surface |
|---|---|---|
| **1. Billing core (API)** — ✅ DONE 2026-07-10 | See "Phase 1 — as built" below. | API |
| **2. Owner + admin billing UI** — ✅ DONE 2026-07-10 | See "Phase 2 — as built" below. | Web (+ minor mobile) |
| **3. Lead capture** — ✅ DONE 2026-07-10 | See "Phase 3 — as built" below. | API + Web |
| **4. Renewals + lifecycle** | Cron: renewal-invoice generation, reminder emails, past-due→suspend; admin invoice/revenue views. | API + Web |
| **5. Automated payments (later)** | PayMongo/Xendit intents + webhook → `MarkInvoicePaidUseCase`. | API |

**Not building now:** self-serve checkout, card auto-debit, dunning automation. The seam is cut for all.

---

## Phase 1 — as built (2026-07-10)

- **Enums** (`common/enums`): `SubscriptionStatus`, `InvoiceStatus`, `BillingCycle`.
- **Migration `0039`**: invoice `payment_reference`, `payment_submitted_at`, `verified_by`,
  `rejection_reason` + `idx_invoices_status`. Prisma `Invoice` updated.
- **Permission** `billing.manage` (seed) → OWNER only (owner-only billing; not STAFF).
- **Provisioning**: `createGymClient` now takes `planId` + optional `billingCycle`, and in the same
  transaction creates `Subscription (PENDING_PAYMENT)` + first `Invoice (OPEN, due +7d, amount from plan)`.
- **Billing module** (`modules/billing`):
  - `GetMySubscriptionUseCase` — owner reads subscription + current invoice + payment instructions
    (from `BILLING_GCASH`/`BILLING_BANK` env).
  - `SubmitPaymentUseCase` — owner submits a reference against an OPEN invoice → AWAITING_VERIFICATION
    (tenancy-checked, billing.manage).
  - `MarkInvoicePaidUseCase` — **the seam**. Idempotent. Marks PAID + activates subscription
    (extends period on renewal) + busts the guard's status cache. Called by admin verify now, webhook later.
  - `RejectPaymentUseCase` — admin rejects AWAITING → OPEN + reason.
  - `BillingController` (`/gyms/:gymId/subscription` + `.../invoices/:id/pay`), `@AllowInactiveSubscription`.
- **Enforcement**: `SubscriptionStatusGuard` registered as a **global** `APP_GUARD`. Decodes the JWT
  itself (no per-controller wiring), gates only gym-type tokens, skips `@AllowInactiveSubscription`
  routes, caches status 30s. Locks `PENDING_PAYMENT`/`SUSPENDED`/`CANCELLED` → **402
  SUBSCRIPTION_INACTIVE**. `ACTIVE`, `PAST_DUE` (grace), and **no-subscription** (legacy gyms) pass.
- **Admin**: `GET /admin/payments/pending`, `POST /admin/invoices/:id/verify` (→ MarkInvoicePaid),
  `POST /admin/invoices/:id/reject`.
- **Tests**: 14 (guard decision matrix, MarkInvoicePaid idempotency, SubmitPayment tenancy/status).
  264 API tests pass total.

**Not yet done in Phase 1:** no live end-to-end run; the admin `create gym` DTO now *requires*
`planId`, so any existing admin-UI caller must send it (Phase 2 web work).

## Phase 2 — as built (2026-07-10)

- **New API endpoint** `GET /admin/billing-plans` — lists the internal `Plan` table (distinct
  from admin's `SaasPlan` CRUD, which manages landing-page marketing tiers). Needed for the
  gym-provisioning plan picker.
- **Admin app**: gym-provisioning form now requires picking a plan + billing cycle; new
  "Pending Payments" queue page (verify/reject with BFF proxy routes).
- **Web app**: owner "Billing" page + reusable `SubscriptionPanel` (status banner, invoice,
  payment-instructions, submit-reference form). The gate lives in `dashboard/layout.tsx`: it
  reuses the `getGymDetail()` call's 402 (from the same global guard) instead of a dedicated
  status endpoint or a `redirect()` — swaps in the panel (owner) or a blocking notice (everyone
  else) in place of the page content when locked.
- **Mobile app**: no payment UI (web/owner-only by design) — just a blocking "subscription
  inactive" screen on 402, mirroring the existing `unauthorizedHandler` pattern.
- Full detail: `docs/progress/2026-07-10-progress.md`.

## Phase 3 — as built (2026-07-10)

- **DB**: `signup_requests` table (migration `0040`) — `planInterest` is **free text**, not a FK.
  The landing page's `SaasPlan` (marketing tiers) and the internal `Plan` (what `Subscription.
  planId` points to) are different tables with different prices; a public lead form has no
  business resolving one to the other. The admin picks the real `Plan` during Convert, same as
  any other Flow A provisioning.
- **New `leads` module** (`apps/api/src/modules/leads/`): `CreateSignupRequestUseCase` (public,
  rate-limited 5/hour/IP via the now-shared `RateLimiterService`), `ListSignupRequestsUseCase`,
  `GetSignupRequestUseCase`, `UpdateSignupRequestStatusUseCase` (NEW→CONTACTED/REJECTED, refuses
  once CONVERTED), `ConvertSignupRequestUseCase` (links a gym id, idempotency-guarded — does
  **not** provision anything itself, see below).
- **Convert is not a monolithic use case.** The admin app already has a working "provision with
  plan" form (Phase 2). Convert re-runs *that same* `POST /admin/gyms` flow (now pre-filled from
  the lead) and then calls `POST /admin/signup-requests/:id/convert { gymId }` to close the loop.
  Avoids re-implementing gym provisioning a second time with slightly different inputs.
- **Endpoints**: `POST /public/signup-requests` (added to the existing `PublicController`, matches
  the existing `/public/plans` + `/public/chat` pattern), `GET/PATCH/POST /admin/signup-requests*`.
- **Admin app**: `/dashboard/leads` queue (contact/reject/convert), `/dashboard/gyms/new` now
  accepts `?leadId=` to prefill the form and auto-convert on success.
- **Landing app**: `SubscribeModal` — pricing card CTA now opens a lead form (gym/owner/email/
  phone) instead of a `mailto:` link, posts directly to the public endpoint (no BFF needed, no
  auth to protect).
- **Refactor**: moved `RateLimiterService` from `ai-insights/application/` to
  `common/rate-limiter/` — it's now used by two unrelated modules (AI query rate limiting, lead
  submission rate limiting), which is exactly the "generic, stable, reusable" bar CLAUDE.md sets
  for `common/`.
- **Bug found and fixed by a live smoke test** (migration `0041`): `subscriptions_status_check`
  and `invoices_status_check` were defined back in `0008_plans_subscriptions` and never updated
  when Phase 1 introduced `PENDING_PAYMENT`/`SUSPENDED` and `AWAITING_VERIFICATION`/`REJECTED`.
  Gym provisioning was **500ing on every request** trying to insert `Subscription(PENDING_
  PAYMENT)` — this was silent in unit tests (mocked Prisma) and only surfaced by actually hitting
  Postgres. Full loop re-verified live after the fix: submit lead → contact → provision → convert
  → 402 confirmed on a locked gym → owner pays → shows in admin's pending queue → admin verifies
  → gym unlocks (402 → 200). All test data cleaned up afterward.
- **Tests**: 10 new (leads use-cases + rate-limit behavior). 274/274 API tests pass total.
  Typecheck clean on api/web/admin/landing/mobile.

## FitOps landing redesign (2026-11-26)

- **Trial form** replaces `SubscribeModal`: name, gym name, mobile and email, all required (lead conversion
  provisions the owner account, which needs an email). A `website` honeypot drops bot submissions silently.
  `POST /public/signup-requests` always answers `201 { received: true }`.
- **Lead notification**: plain-text email to `LEADS_NOTIFY_EMAIL` (skipped if unset; never fails the request).
- **Pricing** (migration `0050`): Starter / Standard / Pro (75 / 200 / 500 members, ₱2,499 / ₱3,999 / ₱6,999 a
  month), every feature on every tier, in both `saas_plans` (new `member_limit`) and `plans` (new `PRO` tier).
  Supersedes the single-plan decision in `0044`.

## 9. Open items to decide during build
- Grace-period length for PAST_DUE → SUSPENDED (e.g. 7 days).
- Invoice due window for the first invoice (e.g. 7 days).
- Where payment instructions (GCash QR image / bank details) are configured — a platform setting vs
  per-org. Recommend a single platform-level config for v1.
