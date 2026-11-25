# Web Admin Dashboard — Implementation Plan

## Overview

The web admin dashboard (`apps/web`) is a Next.js 15 application for gym staff, gym managers, and organization owners. It is entirely separate from the member mobile app.

Members use the mobile app. The web portal is staff and owner territory.

---

## Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| Styling | Tailwind CSS with CSS variables |
| Components | shadcn/ui (owned in-tree) |
| Auth | Server Actions + httpOnly cookies |
| Data fetching | Server Components (default) + TanStack Query for interactive views |
| Route protection | Next.js Middleware |

---

## Auth flow

```
/ (code entry)
  → POST /auth/resolve-code
  → if GYM  → /[gymCode]/login
  → if ORGANIZATION → /[orgSlug]/login

/[code]/login
  → POST /auth/gym/login  OR  /auth/org/login
  → Server Action sets httpOnly cookies: access_token + refresh_token
  → Decode JWT roles:
      → roles = ['MEMBER'] only     → /[code]/not-staff
      → gym staff                   → /dashboard
      → org type                    → /org
```

Tokens are stored as httpOnly cookies. The web app never exposes tokens to client-side JS.

---

## Theming

The staff web app uses the FitOps design tokens only. Gym colors are **not** applied anywhere in the staff
app; a gym's identity appears only through its logo (or initial) in the sidebar badge and on the gym login
page. The branding settings preview is the one place that renders the gym's colors, because it previews the
member app.

Tokens live as HSL triples in `src/app/globals.css` (`:root` for light, `.dark` for the Navy dark mode) and
are mapped to Tailwind names in `tailwind.config.ts`, so classes like `bg-primary` or `bg-nav-active/…`
keep working with opacity modifiers.

| Role | Light | Dark |
|---|---|---|
| `--background` | `#F5F7FA` | `#071A2E` |
| `--surface` | `#FFFFFF` | `#0A2540` |
| `--border` | `#E2E8F0` | `#1E3A5F` |
| `--text` | `#0A2540` | `#F5F7FA` |
| `--muted` | `#475569` | `#CBD5E1` |
| `--primary` / `--primary-fg` | `#1D4ED8` / white | `#93C5FD` / `#0A2540` |
| `--nav-active` / `--nav-active-fg` | `#DBEAFE` / `#1D4ED8` | `#12304F` / `#93C5FD` |
| `--focus-ring` | `#3B82F6` | `#93C5FD` |
| `--chart-primary` / `--chart-highlight` | `#0A2540` / `#3B82F6` | `#93C5FD` / `#3B82F6` |
| `--scrim` (dialog backdrop, used at 60%) | `#0A2540` | black |

Status colors (`--success`, `--warning`, `--destructive` and their `-bg` / `-text` variants) are fixed and
never take the gym color. Volt (`#CCFF00`) is never used in the staff app. Fonts: Manrope for headings and
large numbers (`font-heading`), Inter for everything else. Text sizes keep the app's original scale.

`onAccent()` in `src/lib/accent.ts` picks dark or white text for a background color; the web app uses it
only in the branding preview.

---

## Route structure

```
/                        → code entry (public)
/[code]/login            → login (public)
/[code]/not-staff        → member gate (public)

/dashboard               → gym staff home
/dashboard/check-ins     → active check-ins + history + manual check-in
/dashboard/members       → member list
/dashboard/members/new   → register member
/dashboard/members/[id]  → member detail + renewal
/dashboard/plans         → membership plans
/dashboard/announcements → announcements management
/dashboard/chat          → community chat moderation
/dashboard/staff         → staff management (requires staff.manage)

/org                     → org owner gym list
/org/gyms/[gymId]        → gym settings
/org/settings            → org settings
```

`dashboard` and `org` are reserved path prefixes. Gym codes and org slugs must not conflict with them (gym codes are uppercase alphanumeric, org slugs are lowercase and should be validated against this list on creation).

---

## Cookies

| Cookie | httpOnly | Purpose |
|---|---|---|
| `access_token` | yes | JWT for API calls |
| `refresh_token` | yes | Refresh token |
| `gym_context` | no | Gym/org name, code/slug, primaryColor — for UI display |
| `user_info` | no | User id, name, email — for header display |

---

## Phases

| Phase | Scope |
|---|---|
| **W1** | Foundation: Tailwind + shadcn, CSS variable theming, middleware, auth flow (code entry → login → session), sidebar shell, placeholder pages |
| **W2** | Dashboard home: today's stats, active check-ins, manual check-in action |
| **W3** | Members: list, register, detail, suspend/reactivate |
| **W4** | Renewals + membership plans |
| **W5** | Announcements: create, schedule, archive, list |
| **W6** | Community chat: feed + moderation |
| **W7** | Staff management: invite, assign roles |
| **W8** | Org owner view: gym list, gym settings, org settings |

---

## Sidebar permission model

Nav items are shown based on JWT permissions:

| Nav item | Required permission |
|---|---|
| Dashboard | any authenticated gym user |
| Check-ins | `checkins.manage` |
| Members | `members.view` |
| Plans | `plans.view` or `plans.manage` |
| Renewals | `members.manage` |
| Announcements | `announcements.manage` |
| Chat | `chat.manage` |
| Staff | `staff.manage` |

---

## Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `apps/web/.env.local` | API base URL (e.g. `http://localhost:9001/api/v1`) |

The JWT is verified by the API on every request. The web middleware decodes (without signature verification) only to check expiry and route the user to the correct layout.
