# FitOps landing page spec

Redesign of the current marketing landing page (currently branded "LiftHub", teal on near-black) into the **FitOps** brand. Content and structure change; this is intentional.

Reference files:
- `landing-reference.html` — the full approved design as static HTML. Open it in a browser. It is a **visual reference**; rebuild it with the project's own components and the tokens, don't paste it in.
- `fitops-tokens.css` / `fitops-tokens.json` — colors, type, spacing, radius, shadows.
- `logo/` — FitOps logo files.
- `screenshots/` — (add) exports of the landing board from the design canvas.

---

## 1. Brand

- Name: **FitOps** everywhere on the landing page (logo, copy, page title, footer). Endorsement: "a VerSolutions product" in the footer.
- Fonts: Manrope (headings, numbers, wordmark: "Fit" 800 + "Ops" 500, letter-spacing −0.035em), Inter (all other text), JetBrains Mono (eyebrow labels, endorsement line).
- Colors: Navy `#0A2540` sections and text, Code Blue `#1D4ED8` buttons/links on white sections, Volt `#CCFF00` buttons and highlights **on Navy only**, Signal Blue `#3B82F6` logo dot and glows, Sky `#93C5FD` accents on Navy. Never Volt on white, never white text on Volt.
- Theme: one fixed design (navy sections alternating with white and Cloud `#F5F7FA` sections). The current light/dark toggle is not part of this design.
- Depth on navy sections: faint dot grid (1 px dots, 24 px spacing, white at 7%), soft radial glows (Signal Blue ~25–32%, Volt ~10–12%), gradient cards (`#12304F` → `#0A2540`) with 1 px `rgba(147,197,253,0.18)` borders. Light sections stay flat.

---

## 2. Page structure and copy

Primary action everywhere: **Start free trial** (scrolls to `#trial`). No "Log in" link for now.

### Header (sticky, Navy)
Logo · links: Features `#features`, Member app `#members`, How it works `#how`, Pricing `#pricing`, FAQ `#faq` · button **Start free trial** (Volt).

### Hero (Navy, dot grid, glows)
- Eyebrow: BUILT FOR GYM OWNERS, BY GYM PEOPLE
- H1: **Keep your members.** / **Lose the logbook.** (second line in Volt)
- Sub: FitOps runs check-ins, renewals and member engagement, and gives your members an app with your gym's logo.
- Buttons: **Start free trial** (Volt) · **See the member app** (outline, → `#members`)
- Trust line with checks: Free trial · No credit card required · Free setup assistance
- Visual: staff dashboard on the **Renewals** screen (Due this week, Expired, Expiring soon list with status tags and Remind buttons), a member app phone beside it (gym color gold `#FFC20E`, renewal notice in the fixed **warning** style with a gold "Renew now" button), two floating glass cards: "[N] check-ins · Today · still counting" and "[Member] · Rank #1 this week". The phone must not cover the table.

### Founding gyms strip (`#founding`, white)
- Badge: 50% OFF · Eyebrow: FOUNDING GYMS · ONLY 10 SPOTS
- Headline: **Half price for your entire first year.**
- Text: Our first 10 gyms pay 50% less every month for 12 months on any plan, plus free setup and a direct line to the team building FitOps. Monthly billing only.
- Button: **Claim a founding spot** → `#trial`

### Why gyms switch (Cloud)
- Eyebrow WHY GYMS SWITCH · H2: Members leave quietly. Renewals slip through the cracks.
- Sub: Logbooks, spreadsheets and group chats each hold part of the story, and nobody sees the whole picture until a member is gone.
- Three cards (problem → "FitOps:" fix):
  1. Missed renewals — Expiring memberships get noticed after the member has already stopped coming. → See who expires this week and remind them in one tap.
  2. Paper check-ins — Front-desk logbooks are slow, and the data never gets used. → Members scan a QR code. You see who's in the gym right now.
  3. Members drift away — Motivation fades after the first month without goals or community. → Challenges, leaderboards, badges and an AI coach keep them coming back.

### For you and your staff (`#features`, white)
- H2: One dashboard for the whole front desk. Sub: A web dashboard for owners and staff, on a laptop or a tablet.
- Four highlight cards (Navy gradient): Renewals · Smart check-ins (QR and manual, live attendance, duplicate guard) · AI Insights (ask questions about your gym data in plain language) · Analytics and insights (revenue trends, peak hours, retention rates; small weekly bar chart with peak day highlighted in Volt).
- Grid: Member management (full profiles, photo ID, membership cards) · Plans and billing · Announcements (by gym or across all locations) · Community chat · Leaderboards and badges (weekly and monthly rankings, points from check-ins and activities) · Branches and roles (owner, manager and staff access).

### The member app (`#members`, Navy, glow)
- Eyebrow THE MEMBER APP · H2: Your gym, in your members' pockets. · Sub: One app, branded for every gym. Your members see your logo and your colors, not ours.
- Three phones, same screen in three gym colors: purple (shown adjusted `#814CA2`, white button text), gold `#FFC20E` (dark text), red `#E30613` (white text). Labels: [Gym A] Purple, [Gym B] Gold and black, [Gym C] Red. Do not use real gym names or logos.
- "What your members see": three real screens in gold — Home (plan card, active status, expiry, days left, Check in, recent visits) · AI Coach (Workout/Meal plan tabs, exercises with Swap, "Ask AI for meal advice") · Leaderboard (This week/This month, top ranks, own row highlighted, badges 7-Day Streak, Power User, Iron Warrior).

### How it works (`#how`, white)
- H2: Up and running in a day. Sub: No IT team needed. We help you set up, for free.
- Steps: 1 Start your free trial · 2 Make it yours (logo, color, plans and prices) · 3 Invite your staff (owner, manager, front desk) · 4 Members join (download the app, enter your gym code, check in).
- Note: We aim to have every gym live within a day. Free setup and migration help included.

### Pricing (`#pricing`, white)
- H2: Every feature, on every plan. Sub: Plans differ only by gym size. Prices include VAT.

| Plan | Members | Monthly | Yearly |
|---|---|---|---|
| Starter — For new and smaller gyms. | Up to 75 | ₱2,499 | ₱24,990 · save ₱4,998 |
| **Standard** (Most popular, Navy card) — For established neighborhood gyms. | Up to 200 | ₱3,999 | ₱39,990 · save ₱7,998 |
| Pro — For large and busy gyms. | Up to 500 | ₱6,999 | ₱69,990 · save ₱13,998 |

- Included in every plan: Member app for iOS and Android · Smart check-in system · Staff and owner web dashboard · Membership plans, renewals and billing · Announcements and community chat · Leaderboards and badges · AI Coach: workout and meal plans · AI Insights about your gym data · Email support.
- Callouts: "Pays for itself: if your members pay ₱2,000 a month, keeping just 2 of them from leaving covers Standard." · "Founding gyms: 50% off monthly for your first year. 10 spots only." (→ `#founding`)
- Below: Free trial · No credit card required · Free setup assistance · Cancel anytime. "Extra branches +₱2,499/month each. More than 500 members? Talk to us about a custom plan."

### FAQ (`#faq`, Cloud) — use native `<details>`
1. Can you move our existing members over? — Yes. Free migration help is included. Send us your member list and we'll import it during setup.
2. Do our members see FitOps or our gym? — Your gym. The member app shows your logo and colors.
3. What happens when the trial ends? — Your free trial lasts 14 days, with every feature included and no credit card needed. We'll remind you a few days before it ends. To keep going, choose monthly or yearly billing. If you don't, your account pauses and we keep your data for 30 days, so you can pick up right where you left off.
4. Does it work on a tablet at the front desk? — Yes. The staff dashboard runs in a web browser on a laptop or tablet.

(No payment-methods question until payment options are decided.)

### Trial form (`#trial`, Navy, glows)
- Eyebrow START YOUR FREE TRIAL · H2: See FitOps with your own gym. · Sub: Tell us a little about your gym. We'll set up your account and reach out within a day.
- Fields (all labeled): Your name · Gym name · Mobile number · Number of members. Button **Start free trial** (Volt).
- Below: trust line · link "Prefer a demo? Book a call".

### Footer (darkest navy `#071A2E`)
- Logo + "a VerSolutions product" (JetBrains Mono)
- Contact: **hello@getversolutions.com** (mailto link). No phone number for now.
- Company: Privacy · Terms · Facebook (`https://www.facebook.com/search/top?q=versolutions` — replace with the direct page URL when available). No Instagram for now.

---

## 3. Demo data (replace all bracketed sample text)

Bracketed placeholders like [Name], [00], [Gym A] in the reference are sample data inside product mockups. Replace them with consistent, clearly fictional demo data, for example:
- Gym: "Iron Forge Gym"; members: Ana Reyes, Marco Santos, Kelly Torres, Ben Cruz.
- Hero: Due this week 12, Expired 3; floating cards "87 check-ins", "Ana R. · Rank #1 this week".
- Member home: Monthly Unlimited, expires Aug 14, 18 days left; recent visits Mon, Jul 27 · 54 min, Sat, Jul 25 · 61 min.
- Streak 12 days; leaderboard points 2,450 / 2,100 / 1,890 / You 1,650.
- Analytics: Peak day Saturday, Avg 72/day.
- [Gym A]/[Gym B]/[Gym C] may stay as generic labels, or use fictional names (never real gyms).

---

## 4. Behavior and quality

- Responsive: works from 360 px phones to wide desktops; sections stack, tables/cards wrap, the hero visual scales down (hide floating cards below ~768 px if they crowd).
- Accessibility: one H1; labeled form fields; text contrast ≥ 4.5:1; visible focus styles; respect `prefers-reduced-motion` for any motion.
- SEO: `<title>` "FitOps · Gym management software", meta description from the hero sub, Open Graph title/description/image.
- Analytics (if the project has tracking): events for every "Start free trial" click (with section name), "Claim a founding spot", "See the member app", form submit, FAQ open.
- Chat widget: if kept, remove any unread badge that shows before a real message exists.

## 5. To confirm with the owner before launch

- Renewal reminders: the Remind / Remind all buttons, "remind them in one tap" copy and the member "Renew now" prompt assume FitOps sends renewal reminders. If it doesn't yet, change to "See who expires this week" and remove those buttons.
- Trial terms: 14 days, reminders, account pause and 30-day data hold must match what the product actually does.
- Where the trial form submits (existing endpoint, CRM, or email to hello@getversolutions.com).
