# Member Features

This document covers the planned member-facing features beyond the core MVP.

These features are designed to drive **engagement**, **retention**, and **personalisation** for gym members.

Read `docs/00-product/end-to-end-flows.md` for the core membership flows (check-in, announcements, chat).

---

## Feature 1 — Member Onboarding Flow (animated questionnaire)

### What it is

When a member opens the mobile app for the first time after activating their account, they are shown an animated onboarding questionnaire — one question per screen, Duolingo-style.

### Questions collected

| Question | Field | Type |
|----------|-------|------|
| What's your name? | (from user record — personalise greeting) | read-only |
| How old are you? | `age` | integer |
| What's your current weight? | `current_weight` | decimal (kg) |
| What's your target weight? | `target_weight` | decimal (kg, optional) |
| What's your goal? | `goal` | enum |
| How active are you currently? | `activity_level` | enum |

### Goal options
- `LOSE_WEIGHT` — lose fat, calorie deficit focus
- `GAIN_MUSCLE` — build muscle, calorie surplus focus
- `MAINTAIN` — maintain current weight and fitness
- `IMPROVE_FITNESS` — general fitness, endurance

### Activity level options
- `SEDENTARY` — little to no exercise
- `LIGHT` — 1–2 days/week
- `MODERATE` — 3–4 days/week
- `ACTIVE` — 5–6 days/week
- `VERY_ACTIVE` — daily intense exercise

### How it works (mobile)

1. On login, app calls `GET /gyms/:gymId/members/:memberId/profile`
2. If `onboarding_done = false` → show onboarding flow
3. Animated slide per question with progress bar
4. Final screen: summary + "Let's go!" CTA
5. App calls `PATCH /gyms/:gymId/members/:memberId/profile` with all answers + `onboarding_done: true`
6. User never sees the onboarding again

### Implementation note

The onboarding must be skippable. If skipped, `onboarding_done` is still set to `true` with default/null values so the user is not shown the flow again.

---

## Feature 2 — Member Profile

### What it is

A persistent fitness profile for each member, stored separately from their gym membership record.

### Database table: `member_profiles`

```sql
CREATE TABLE member_profiles (
  member_id        UUID         PRIMARY KEY REFERENCES gym_members(id) ON DELETE CASCADE,
  age              INT,
  current_weight   DECIMAL(5,2),  -- kg
  target_weight    DECIMAL(5,2),  -- kg, optional
  goal             VARCHAR(50),   -- LOSE_WEIGHT | GAIN_MUSCLE | MAINTAIN | IMPROVE_FITNESS
  activity_level   VARCHAR(50),   -- SEDENTARY | LIGHT | MODERATE | ACTIVE | VERY_ACTIVE
  onboarding_done  BOOLEAN        NOT NULL DEFAULT false,
  updated_at       TIMESTAMPTZ    NOT NULL DEFAULT now()
);
```

### Database table: `member_weight_logs`

Used to track weight over time for progress charting.

```sql
CREATE TABLE member_weight_logs (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   UUID         NOT NULL REFERENCES gym_members(id) ON DELETE CASCADE,
  weight      DECIMAL(5,2) NOT NULL,  -- kg
  logged_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);
```

### API endpoints

```
GET    /gyms/:gymId/members/:memberId/profile        → get member profile
PATCH  /gyms/:gymId/members/:memberId/profile        → update profile
POST   /gyms/:gymId/members/:memberId/weight-logs    → log a weight entry
GET    /gyms/:gymId/members/:memberId/weight-logs    → weight history
```

Member can only access their own profile. Staff with `members.view` can read any profile.

---

## Feature 3 — Personalised Greeting

### What it is

Every time the member opens the app, they are greeted by name with a time-aware message.

### Logic (mobile, client-side)

```
Morning  (5am–12pm)  → "Good morning, Jake! 💪"
Afternoon (12pm–5pm) → "Good afternoon, Jake!"
Evening   (5pm–9pm)  → "Good evening, Jake!"
Late night (9pm+)    → "Still grinding, Jake? 🔥"
```

This is entirely client-side — no API call needed. The name comes from the JWT or the user record fetched after login.

### Enhanced greeting based on data

If check-in data is available, enrich the greeting:

- Last check-in was today → "Welcome back! You're on a roll this week."
- 3+ day streak → "3-day streak! Keep it up."
- First visit this week → "Great to see you. Let's make this session count."

The check-in data is already in the API — `GET /gyms/:gymId/checkins?memberId=<id>&limit=7` gives the last 7 check-ins.

---

## Feature 4 — Attendance Reminder

### What it is

If a member has not checked in for 3 or more consecutive days, they receive a push notification or in-app banner encouraging them to come back.

### How it works

A new cron job runs every morning at 8am:

```
Find members where:
  - status = ACTIVE
  - last check_in.checked_in_at < now() - 3 days
  - reminder not already sent in the last 24 hours

→ send push notification or in-app notification
```

### Notification messages (rotate or personalise)

- "Hey Jake, we miss you at the gym! 💪 Come in today."
- "It's been 3 days — your streak is waiting."
- "Don't break the habit. Your gym session is overdue!"

### Implementation requires

- Expo Push Notifications (mobile)
- A `notification_tokens` table to store device tokens per user
- A `notification_logs` table to track what was sent (prevent spam)

### Future variants

- 7-day absence → more urgent message
- Membership expires in 5 days → renewal reminder
- Goal milestone reached (e.g. 30 check-ins) → celebration message

---

## Feature 5 — AI Workout Suggestions

### What it is

Based on the member's profile (goal, activity level, age, weight) and their recent check-in frequency, the AI suggests personalised workout plans.

### How it works

1. Member opens "Workouts" tab in mobile app
2. App calls `POST /gyms/:gymId/members/:memberId/ai/workout-suggestion`
3. API builds context from:
   - `member_profiles` (goal, activity level, age, weight)
   - Recent check-ins (frequency, consistency)
   - Current date/day of week
4. API calls Claude with this context
5. Claude returns a structured workout suggestion
6. API logs usage to `ai_usage` table
7. Response returned to app

### Example AI context sent to Claude

```
Member profile:
- Age: 28, Male
- Current weight: 85kg, Target: 75kg
- Goal: LOSE_WEIGHT
- Activity level: MODERATE (3-4x per week)
- Check-in frequency: 2x in the last 7 days

Today is Monday. Generate a workout plan for today's session
focused on fat loss. Keep it to 45-60 minutes.
Include: warm-up, main exercises with sets/reps, cool-down.
```

### Usage is gated by subscription

Each AI call is logged to `ai_usage`. The API checks the gym's subscription token quota before calling Claude. If quota is exceeded, return `429 AI_QUOTA_EXCEEDED`.

---

## Feature 6 — AI Meal Prep and Nutrition Guidance

### What it is

Members can ask for personalised meal prep ideas and nutrition guidance based on their fitness goal.

### How it works

Same pattern as workout suggestions — member sends a request, API builds context from profile, calls Claude, returns the plan.

### Example use cases

- "What should I eat today to support muscle gain?"
- "Give me a weekly meal prep plan for weight loss."
- "How much protein should I be eating?"

Claude uses the member's goal, weight, and activity level to give relevant advice instead of generic answers.

---

## Feature 7 — Calorie Tracking via Photo

### What it is

Member takes a photo of their meal. The app sends it to the API. Claude Vision analyses the image and estimates the calories and macros.

### How it works

1. Member taps "Log a meal" in the app
2. App opens camera, member takes a photo
3. App uploads image to API: `POST /gyms/:gymId/members/:memberId/ai/analyse-meal`
4. API sends image to Claude Vision with prompt:
   ```
   Analyse this meal photo. Estimate:
   - Total calories
   - Protein (g)
   - Carbohydrates (g)
   - Fat (g)
   - Serving size estimation
   Return as JSON.
   ```
5. API returns the estimates to the app
6. Member can confirm and log it to their food diary

### Database table: `member_food_logs`

```sql
CREATE TABLE member_food_logs (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   UUID         NOT NULL REFERENCES gym_members(id) ON DELETE CASCADE,
  photo_url   TEXT,
  description TEXT,
  calories    INT,
  protein_g   DECIMAL(6,2),
  carbs_g     DECIMAL(6,2),
  fat_g       DECIMAL(6,2),
  logged_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);
```

---

## Feature 8 — Gym Theme Configuration

### What it is

Each gym can customise the look of the app — primary color, logo, and favicon. The theme is applied automatically when a member or staff member opens the app for their gym.

### Theme fields (added to `gym_profile`)

```sql
ALTER TABLE gym_profile ADD COLUMN primary_color VARCHAR(7);   -- hex e.g. #FF5733
ALTER TABLE gym_profile ADD COLUMN logo_url       TEXT;
ALTER TABLE gym_profile ADD COLUMN favicon_url    TEXT;
```

### How it works

1. App calls `POST /auth/resolve-code` with the gym code
2. Response includes the gym's theme: `{ primaryColor, logoUrl }`
3. App applies the theme before showing the login screen
4. All screens use the gym's brand colours and logo

### Subscription gating

| Plan | Theme features |
|------|---------------|
| Basic | Default theme only |
| Premium | Custom primary color + logo |
| Enterprise | Full branding (colors, logo, favicon, custom domain) |

The API enforces this — if the gym's subscription doesn't include custom branding, the theme fields are returned as `null` and the app uses defaults.

---

## Implementation order

These features are post-MVP. Build in this order:

| Phase | Feature | Depends on |
|-------|---------|-----------|
| 13 | Member Profile API + DB migration | Phase 12 (mobile) |
| 13 | Gym Theme API + DB migration | Phase 11 (web) |
| 14 | Onboarding flow (mobile, animated) | Phase 13 |
| 14 | Personalised greeting | Phase 13 |
| 15 | Attendance reminder cron job | Phase 14 |
| 15 | Push notifications setup | Phase 14 |
| 16 | AI workout suggestions | Phase 13 |
| 16 | AI meal prep guidance | Phase 13 |
| 16 | Calorie tracking via photo | Phase 13 |

---

## AI context strategy

When calling Claude for any member-facing feature, always include:

```
Gym: <gymName>
Member: <age>, <goal>, <activityLevel>, <currentWeight>kg → <targetWeight>kg
Check-in frequency: <N> times in last 30 days
Today: <dayOfWeek>, <date>
```

This makes every AI response personalised and relevant without the member needing to re-explain their situation each time.

The `ai_usage` table (already in the schema) tracks token usage per gym per member so quota enforcement works correctly.
