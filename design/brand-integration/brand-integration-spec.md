# FitOps brand integration spec

Where each brand appears across the three surfaces. Fonts and colors are already done; this spec is about **placement**: logos, names, sender names, page titles, endorsement lines and who "leads" each screen.

Three brand layers:
- **VerSolutions** — the company and legal entity.
- **FitOps** — the product.
- **The gym** — FitOps' customer (tenant). Its logo and accent color are set in the staff app's member app branding settings.

| Surface | Users | Leading brand | Also visible |
|---|---|---|---|
| Provider console | VerSolutions team | VerSolutions | FitOps as the product; gym logos as customer records |
| Staff app (web) | Gym owners and staff | FitOps | Gym as workspace badge; "a VerSolutions product" on login, emails, About, billing |
| Member app (mobile) | Gym members | The gym | FitOps on store listing, launch screen, gym-code screen, login and About |

Reference: `reference/*.html` (open in a browser; sample data). Logos and tokens: `../landing/`.

**Scope rule:** apply branding to screens, emails and metadata that already exist. Items marked **(new feature)** need functionality that may not exist yet. Build them only if the owner approves; otherwise list them.

---

## 1. Provider console (VerSolutions admin)

Reference: `01-provider-console-gym-list.html`, `02-provider-console-gym-detail.html`.

| Element | Specification |
|---|---|
| Name | **VerSolutions Console** (browser title "Gyms · VerSolutions Console") |
| Internal indicator | Full-width bar above everything, Spark Amber `#F59E0B` background, Navy text, JetBrains Mono 12 px 600: "INTERNAL · VERSOLUTIONS CONSOLE · PRODUCTION" (show the environment name: PRODUCTION / STAGING). Never Volt. |
| Sidebar | Navy `#0A2540` background (deliberately different from the staff app's white sidebar). VerSolutions logo at top (use the real VerSolutions logo file; not included here). |
| Product switcher | Card under the logo: FitOps reversed mark + "Product" label + FitOps wordmark + chevron. With only one product it can be static; it becomes a switcher when more products exist. |
| Nav | Gyms, Subscriptions, Billing, Support sessions, Product updates, Team, Settings (keep whatever exists; style active item `#12304F` bg + white text + Sky icon). |
| Gym list | Each gym shown with **its own logo** (or initial on its accent color), name, location, plan (Starter/Standard/Pro), status tag (Active green, Trial blue, Past due orange, Paused grey), members used / plan limit, Founding tag (Volt Tint `#F4FFCC` bg, Navy text), next billing. The gym's color never themes the console. |
| Gym detail | Header with gym logo, name, status, Founding tag, location, owner. Sections: Plan and billing (plan, price, founding offer end date, billing method, next invoice, "Invoice issuer: VerSolutions"), Usage (members vs limit bar in Signal Blue, staff accounts, gym code, app installs), **Member app branding preview** (gym logo, accent hex, phone preview using `buildMemberTheme()`), Support log. |
| View as support **(new feature if missing)** | Button opens the gym's staff app in support mode (see 2.4). Every session logged with team member, gym, start/end, actions; visible to the gym owner. |
| Footer/legal | None needed (internal). |

## 2. Staff app (web)

References: `03-staff-app-touchpoints.html`, `04-staff-app-journey.html`.

### 2.1 Everywhere
- FitOps product UI and colors. The gym's logo and color appear **only** in the top-left workspace badge (logo or initial, gym name, location; switcher chevron if the user has several gyms or locations).
- Small FitOps lockup at the bottom of the sidebar.
- Favicon: FitOps staff icon (`../landing/logo/fitops-app-icon-staff.svg`). Page titles: "[Page] · FitOps" (e.g. "Dashboard · FitOps").
- All roles see the same branding; roles only change which menu items appear.

### 2.2 Login and account screens
- Login, password reset, create password, accept invite: FitOps logo + wordmark centered; heading "Sign in to FitOps" (or "Create your password" + "for [Gym name]"); primary button Code Blue.
- Under the form: "a VerSolutions product" in JetBrains Mono 12 px, Slate.

### 2.3 Settings
- **About and billing:** FitOps mark + wordmark, plan name and price ("Standard plan · ₱3,999 / month"), next invoice, "FitOps Help", contact hello@getversolutions.com, line "FitOps is a product of VerSolutions." with Terms and Privacy links.
- **Billing / choose plan (if it exists):** Starter ₱2,499, Standard ₱3,999 (highlighted), Pro ₱6,999 per month, VAT inclusive; founding offer note if applicable ("Founding gym: 50% off monthly for 12 months"); footer "Prices include VAT. Billed by VerSolutions."
- **Member app branding:** where the gym sets logo and accent (already designed; keep).

### 2.4 Support access banner **(new feature if missing)**
When a VerSolutions team member views a gym's staff app: persistent bar at the very top of every page, Spark Amber background, Navy text 13 px 600: "You're viewing [Gym name] as VerSolutions support" + outlined "Exit" button. Cannot be dismissed.

### 2.5 Trial banner (if trials exist in-app)
Top of content area, Blue Tint `#DBEAFE` background, Navy text: "**Free trial** · [N] days left" + Code Blue "Choose a plan" button. Never the gym's color.

### 2.6 First-run setup (if it exists)
FitOps-styled steps (Gym profile, Member app branding, Plans and prices, Invite staff) with "Step X of 4". The gym's logo and color appear only as the content being chosen, with a live member app preview.

### 2.7 Emails to staff and owners
Welcome/trial ready, invites, password reset, billing, product updates:
- Sender name **FitOps**, address hello@getversolutions.com (or a no-reply on the same domain).
- Header: FitOps mark + wordmark. Gym name in subject/body where relevant ("You're invited to Iron Forge Gym on FitOps").
- Button Code Blue. Footer: "FitOps · a VerSolutions product".

### 2.8 Invoices and receipts
- Issuer: **VerSolutions** with registered business name, address and TIN (owner to provide).
- Line item: "FitOps [Plan] plan", billing period, any founding discount; "Total, VAT inclusive".

## 3. Member app (mobile)

Reference: `05-member-app-journey.html`.

### 3.1 Before the member joins a gym — FitOps leads
- **Store listings (iOS/Android):** app name "FitOps"; icon `../landing/logo/fitops-app-icon-member.svg` (Navy, white tiles, Volt dot); developer/seller VerSolutions; screenshots showing the app in several gym colors; short description mentioning joining with your gym's code. *(Store metadata is set in the store consoles; prepare the text and assets.)*
- **Launch/splash screen:** FitOps reversed mark (Volt dot) + wordmark centered on `#0E1116`. Static image; it cannot vary by gym.
- **Gym-code / onboarding screen:** FitOps lockup, "Join your gym", gym code input (JetBrains Mono), default theme accent Volt `#CCFF00` with dark text.
- **Login screen:** gym branding if the gym is known, plus "Powered by FitOps" (small, muted).

### 3.2 After joining — the gym leads
- **Welcome screen** right after the code is accepted: gym logo large, "Welcome to [Gym name]", primary button in the gym accent.
- Every screen uses the gym's logo, name and accent via `buildMemberTheme(gym.accent, mode)`. Status colors stay fixed.
- **Profile:** gym card at top (logo, name, "Switch gym" **(new feature if members can belong to several gyms)**); at the bottom "Powered by FitOps" with the mark, then "Version · Terms · Privacy · VerSolutions".
- "Powered by FitOps" appears **only** on login and Profile/About — never on Home or the tab bar.

### 3.3 Push notifications
The OS shows the app name "FitOps". Put the gym name first in the notification title: "Iron Forge Gym" + body "Your membership expires in 2 days." Apply to all gym-originated notifications.

### 3.4 Emails to members
Welcome, renewal, receipts, announcements: sender name "[Gym name] via FitOps"; header with the gym's logo and name; buttons in the gym accent (with `onAccent()` text color); footer "Powered by FitOps". Gym with no theme: Volt default on dark header.

## 4. Cross-cutting

- **Remove "LiftHub" everywhere:** UI strings, page titles, metadata, email templates, push copy, error pages, store listings, environment/config names visible to users. List every occurrence found, including domains (e.g. app.lifthub.io) and ask before changing domains; plan redirects from old URLs.
- **Who sends what:** messages to staff/owners come from FitOps; messages to members come from the gym via FitOps; invoices come from VerSolutions.
- **Legal:** Terms and Privacy name VerSolutions as the company and FitOps as the product.
- **Support contact:** hello@getversolutions.com.

## 5. Checklist

- [ ] Provider console shows the internal bar and VerSolutions branding; gym colors appear only on gym records.
- [ ] Staff app: gym color only in the workspace badge; FitOps favicon and titles; endorsement on login, About, emails and billing.
- [ ] Support banner shows whenever VerSolutions staff view a gym (if the feature exists).
- [ ] Member app: FitOps only on store listing, launch, gym-code, login and About; gym brand everywhere else; notifications lead with the gym name.
- [ ] Emails use the right sender names (FitOps vs "[Gym] via FitOps").
- [ ] No "LiftHub" left in user-facing text.

## 6. Needs from the owner

- Real VerSolutions logo file.
- Registered business name, address and TIN for invoices.
- New app domain to replace app.lifthub.io.
- Decisions on the **(new feature)** items: support access mode and log, product switcher, members in several gyms, in-app trial banner and plan selection.
