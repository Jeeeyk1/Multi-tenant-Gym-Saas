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

Theme is driven by CSS variables on `:root`. The default palette is a dark theme matching the mobile app. When a gym has a configured `primaryColor`, it is applied server-side via an inline CSS variable on the layout wrapper — no client-side flash.

### Default CSS variables

```css
--background: 0 0% 4%;         /* #0A0A0A */
--surface:    0 0% 8%;          /* #141414 */
--border:     0 0% 16%;         /* #2A2A2A */
--primary:    156 72% 67%;      /* #6EE7B7 mint (default, overridden per gym) */
--primary-fg: 0 0% 0%;          /* #000000 */
--text:       0 0% 100%;        /* #FFFFFF */
--muted:      0 0% 53%;         /* #888888 */
--warning:    16 100% 60%;      /* #FF6B35 burn orange */
--destructive: 0 84% 60%;       /* red */
```

The `--primary` variable is overridden per gym using the `primaryColor` value from `resolve-code`. The conversion from hex → HSL happens in `lib/utils.ts`.

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
| `NEXT_PUBLIC_API_URL` | `apps/web/.env.local` | API base URL (e.g. `http://localhost:3000/api/v1`) |

The JWT is verified by the API on every request. The web middleware decodes (without signature verification) only to check expiry and route the user to the correct layout.
