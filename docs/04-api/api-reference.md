# API Reference

This document is the canonical reference for all HTTP and WebSocket endpoints.

Frontend and mobile agents **must read this file** before building any feature that touches the API.

---

## Base URL

```
http://localhost:9001/api        ← development
https://<domain>/api             ← production
```

---

## Authentication

### Token types

| Type | Issued by | Used for |
|------|-----------|----------|
| Gym JWT | `POST /auth/gym/login` | All gym-scoped operations (staff and members) |
| Org JWT | `POST /auth/org/login` | Org-level operations (owner dashboard) |

### Sending the token

All protected endpoints require:
```
Authorization: Bearer <token>
```

### Token payload

**Gym JWT** (most common):
```json
{
  "sub": "<userId>",
  "type": "gym",
  "gymId": "<gymId>",
  "gymCode": "DEVGYM",
  "roles": ["STAFF"],
  "permissions": ["members.view", "members.details", "announcements.manage", "..."]
}
```
Roles are `OWNER`, `STAFF` and `TRAINER`. A user who is also a member of the gym also gets `MEMBER` and the member
permissions (`checkins.self`, `announcements.view`). See `docs/02-domains/staff-and-rbac.md`.

**Org JWT**:
```json
{
  "sub": "<userId>",
  "type": "org",
  "organizationId": "<orgId>",
  "orgRole": "OWNER"
}
```

### Refresh flow

Access tokens expire (default 15 min). Use the refresh token to get a new pair silently.

---

## Error response shape

All errors follow this shape:
```json
{
  "statusCode": 403,
  "error": "Forbidden",
  "code": "PERMISSION_DENIED",
  "message": "You do not have permission to perform this action"
}
```

`code` is the machine-readable error identifier — use it in frontend error handling, not `message`.

---

## Endpoints

---

### Auth

#### POST /auth/resolve-code
Resolve whether a code is an org slug or a gym code. Used on the login entry screen.

**Public — no auth required.**

Request:
```json
{ "code": "devgym" }
```

Response `200`:
```json
{
  "type": "gym",
  "gymId": "<id>",
  "gymName": "Dev Gym",
  "logoUrl": null
}
```
or
```json
{
  "type": "org",
  "organizationId": "<id>",
  "organizationName": "Dev Organization"
}
```

---

#### POST /auth/gym/login
Log in as a gym user (staff or member).

**Public — no auth required.**

Request:
```json
{
  "gymCode": "DEVGYM",
  "email": "manager@devgym.com",
  "password": "Password123!"
}
```

Response `200`:
```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<jwt>",
  "user": {
    "id": "<userId>",
    "email": "manager@devgym.com",
    "fullName": "Dev Manager"
  }
}
```

Errors:
- `401 INVALID_CREDENTIALS` — wrong email or password

---

#### POST /auth/org/login
Log in as an org owner.

**Public — no auth required.**

Request:
```json
{
  "organizationId": "<orgId>",
  "email": "owner@example.com",
  "password": "Password123!"
}
```

Response `200`: same shape as gym login.

---

#### POST /auth/refresh
Rotate the refresh token. Returns a new access + refresh token pair.

Request:
```json
{ "refreshToken": "<token>" }
```

Response `200`:
```json
{
  "accessToken": "<new-jwt>",
  "refreshToken": "<new-jwt>"
}
```

Errors:
- `401 INVALID_REFRESH_TOKEN`

---

#### POST /auth/logout
Revoke the refresh token.

Request:
```json
{ "refreshToken": "<token>" }
```

Response `200`:
```json
{ "ok": true }
```

---

#### POST /auth/activate
Set password and activate a new account (used from the invitation email link).

**Public — no auth required.**

Request:
```json
{
  "token": "<activation-token-from-email>",
  "password": "NewPassword123!"
}
```

Response `200`:
```json
{ "ok": true }
```

---

### Gyms

#### GET /gyms/:code
Resolve a gym by its short code (e.g. `DEVGYM`).

**Public — no auth required.**

Response `200`:
```json
{
  "id": "<gymId>",
  "name": "Dev Gym",
  "code": "DEVGYM",
  "timezone": "Asia/Manila",
  "is247": true
}
```

---

#### GET /gyms/:id
Gym detail including profile.

**Requires auth.**

Response `200`:
```json
{
  "id": "<gymId>",
  "name": "Dev Gym",
  "code": "DEVGYM",
  "address": "123 Dev Street",
  "timezone": "Asia/Manila",
  "is247": true,
  "profile": {
    "description": "...",
    "contactEmail": "admin@devgym.com",
    "logoUrl": null
  },
  "schedules": [
    { "dayOfWeek": 0, "isClosed": false, "openTime": "00:00", "closeTime": "23:59" }
  ]
}
```

---

#### PATCH /gyms/:gymId/profile
Update gym profile (branding, contact info, social links).

**Requires `gym.settings` permission.**

Request (all fields optional):
```json
{
  "description": "Your gym description",
  "logoUrl": "https://res.cloudinary.com/...",
  "primaryColor": "#6EE7B7",
  "secondaryColor": "#3B82F6",
  "contactEmail": "hello@yourgym.com",
  "contactPhone": "+63 912 345 6789",
  "facebookUrl": "https://facebook.com/yourgym",
  "instagramUrl": "https://instagram.com/yourgym"
}
```

Response `200`: updated gym profile fields.

---

#### POST /gyms/:gymId/profile/logo
Upload a gym logo image. Stores in Cloudinary and returns the CDN URL.

**Requires `gym.settings` permission.**

Request: `multipart/form-data` with field `file` (image/jpeg, image/png, image/svg+xml, image/webp). Max 5 MB.

Response `200`:
```json
{ "url": "https://res.cloudinary.com/gym-saas/image/upload/gym-saas/logos/gym-<id>-logo.jpg" }
```

Use the returned `url` as the `logoUrl` when calling `PATCH /gyms/:gymId/profile`.

**Storage is abstracted.** The current implementation uses Cloudinary. To switch to S3, change `StorageModule` provider from `CloudinaryAdapter` to `S3Adapter` — no other files change.

---

#### PATCH /gyms/:gymId/schedules
Update weekly schedule.

**Requires `gym.manage` permission.**

Request:
```json
{
  "schedules": [
    { "dayOfWeek": 0, "isClosed": false, "openTime": "06:00", "closeTime": "22:00" },
    { "dayOfWeek": 6, "isClosed": true }
  ]
}
```

Response `200`: updated schedule array.

---

### Staff

#### GET /gyms/:gymId/staff
List all staff in a gym.

**Requires `staff.manage` permission.**

Response `200`:
```json
[
  {
    "id": "<gymStaffId>",
    "isActive": true,
    "user": { "id": "<userId>", "email": "...", "fullName": "..." },
    "roles": ["STAFF"]
  }
]
```

---

#### POST /gyms/:gymId/staff
Invite a user as staff.

**Requires `staff.manage` permission.**

Request:
```json
{
  "email": "newstaff@example.com",
  "fullName": "New Staff",
  "phone": "+63…",
  "role": "STAFF"
}
```
`role` (`OWNER`, `STAFF` or `TRAINER`) is optional and given in the same transaction. Only an owner can invite
an owner (`403 OWNER_ROLE_PROTECTED`).

Response `201`:
```json
{
  "id": "<gymStaffId>",
  "userId": "<userId>",
  "gymId": "<gymId>",
  "isActive": true
}
```

---

#### DELETE /gyms/:gymId/staff/:staffId
Deactivate a staff member.

**Requires `staff.manage` permission.**

Response `200`:
```json
{ "ok": true }
```

---

#### POST /gyms/:gymId/staff/:staffId/roles
Assign a role to a staff member.

**Requires `staff.manage` permission.**

Request:
```json
{ "roleId": "<roleId>" }
```

Response `200`:
```json
{ "ok": true }
```

---

#### DELETE /gyms/:gymId/staff/:staffId/roles/:roleId
Remove a role from a staff member.

**Requires `staff.manage` permission.**

Response `200`:
```json
{ "ok": true }
```

---

#### GET /gyms/:gymId/role-settings
The owner's per-gym switches for what Staff and Trainers may do. **Requires `gym.settings`** (Owner).

Response `200`:
```json
[
  {
    "key": "STAFF_MANAGES_LEADERBOARD",
    "role": "STAFF",
    "permission": "leaderboard.manage",
    "label": "Staff can manage the leaderboard",
    "description": "Choose the leaderboard lifts and set the bronze, silver and gold lift ladders.",
    "enabled": true,
    "enabledByDefault": true
  }
]
```

#### PUT /gyms/:gymId/role-settings/:key
`{ "enabled": false }` → `204`. Unknown key → `404 ROLE_SETTING_NOT_FOUND`. Applies to each staff member at their
next token refresh (within the access-token lifetime, 15 minutes by default). Setting the current value is a no-op.

---

### Membership Plans

#### GET /gyms/:gymId/plans
List all membership plans for the gym.

**Requires auth.**

Response `200`:
```json
[
  {
    "id": "<planId>",
    "name": "Monthly Plan",
    "type": "MONTHLY",
    "price": "1500.00",
    "durationDays": 30,
    "isActive": true
  }
]
```

---

#### POST /gyms/:gymId/plans
Create a membership plan.

**Requires `plans.manage` permission.**

Request:
```json
{
  "name": "Monthly Plan",
  "type": "MONTHLY",
  "price": 1500.00,
  "durationDays": 30
}
```

Response `201`: created plan object.

---

#### PATCH /gyms/:gymId/plans/:id
Update a membership plan.

**Requires `plans.manage` permission.**

Request (all fields optional):
```json
{
  "name": "Updated Plan",
  "price": 1800.00,
  "isActive": false
}
```

Response `200`: updated plan object.

---

### Members

#### GET /gyms/:gymId/members
List members (paginated).

**Requires `members.view` permission.**

Query params:
- `page` (default 1)
- `limit` (default 20, max 100)
- `status` — `ACTIVE` | `EXPIRED` | `SUSPENDED`
- `search` — name or email

Response `200`:
```json
{
  "data": [
    {
      "id": "<memberId>",
      "membershipNumber": "MBR-DEV001",
      "status": "ACTIVE",
      "expiryDate": "2026-05-20",
      "user": { "id": "...", "email": "...", "fullName": "..." },
      "plan": { "id": "...", "name": "Monthly Plan" }
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

---

#### POST /gyms/:gymId/members
Register a new member.

**Requires `members.manage` permission.**

Request:
```json
{
  "email": "newmember@example.com",
  "fullName": "Jane Doe",
  "planId": "<planId>"
}
```

Response `201`:
```json
{
  "id": "<memberId>",
  "membershipNumber": "MBR-00042",
  "status": "ACTIVE",
  "expiryDate": "2026-05-20",
  "qrCodeToken": "<token>"
}
```

An invitation email is automatically sent to the member.

---

#### GET /gyms/:gymId/members/:id
Member detail.

**Requires `members.view` permission.**

Response `200`: full member object with user, plan, and renewal history.

---

#### PATCH /gyms/:gymId/members/:id/suspend
Suspend a member.

**Requires `members.manage` permission.**

Response `200`:
```json
{ "id": "...", "status": "SUSPENDED" }
```

---

#### PATCH /gyms/:gymId/members/:id/reactivate
Reactivate a suspended member.

**Requires `members.manage` permission.**

Response `200`:
```json
{ "id": "...", "status": "ACTIVE" }
```

---

#### GET /gyms/:gymId/members/:id/qr
Get a member's QR token (used for QR code generation on the client).

**Requires `members.view` permission.**

Response `200`:
```json
{ "qrCodeToken": "<token>" }
```

---

#### PATCH /gyms/:gymId/members/me/profile
Save the caller's fitness profile. Every field is optional so onboarding can save one step at a time.
`PATCH /gyms/:gymId/members/:memberId/profile` is the staff version (`members.edit`); it ignores
`sex`, `unitSystem`, `healthCaution` and `healthDataConsent`, and staff responses omit the health fields.

Request (all optional; weights in kg, height in cm — clients convert imperial input):
```json
{
  "age": 30, "heightCm": 180, "weightKg": 80, "targetWeightKg": 70,
  "sex": "MALE", "unitSystem": "METRIC",
  "fitnessGoal": "LOSE_WEIGHT", "activityLevel": "MODERATE", "daysPerWeek": 4,
  "experienceLevel": "BEGINNER", "preferredStyle": "WEIGHTS", "dietType": "NONE", "injuries": "",
  "healthCaution": false, "healthDataConsent": true, "onboardingDone": true
}
```

| Field | Values / bounds |
|---|---|
| `age` | 13–100 |
| `heightCm` | 120–230 |
| `weightKg`, `targetWeightKg` | 30–300, max 2 decimals |
| `sex` | `MALE` \| `FEMALE` \| `UNSPECIFIED` (calorie formula only) |
| `unitSystem` | `METRIC` \| `IMPERIAL` (display preference only) |
| `activityLevel` | `SEDENTARY` \| `LIGHT` \| `MODERATE` \| `VERY_ACTIVE` \| `ATHLETE` |
| `healthCaution` | `true` when the member reports pregnancy or a medical condition |
| `healthDataConsent` | `true` records consent (first time only); `false` withdraws it |

---

### Fitness plan

Deterministic daily targets (no AI). All routes are `/gyms/:gymId/members/:memberId/fitness-plan…`
and are **member-only** (`MemberSelfGuard`): plans are derived from health data, so staff get `403`.
Withdrawing consent deletes the member's saved plans.

#### GET …/fitness-plan/options
Maintenance targets and each pace option, calculated from the stored profile. Saves nothing.

Response `200`:
```json
{
  "calculatorVersion": 1,
  "direction": "LOSS",
  "bmrKcal": 1780,
  "tdeeKcal": 2759,
  "maintenance": { "kcal": 2760, "proteinG": 128, "carbsG": 389, "fatG": 77, "waterMl": 2800 },
  "options": [
    {
      "pace": "BALANCED",
      "available": true,
      "unavailableReason": null,
      "weeklyRateKg": -0.5,
      "targets": { "kcal": 2210, "proteinG": 144, "carbsG": 271, "fatG": 61, "waterMl": 2800 },
      "weeksToGoal": 20,
      "targetDate": "2027-04-12"
    }
  ],
  "recommendedPace": "BALANCED",
  "adviseProfessional": false
}
```
`options` has STEADY, BALANCED and FAST in that order (empty when `direction` is `MAINTAIN`).
`unavailableReason`: `UNDER_18` | `HEALTH_CAUTION` | `SAFE_LIMIT_REACHED`.

Errors (`422`): `HEALTH_DATA_CONSENT_REQUIRED`, `PROFILE_INCOMPLETE` (message lists the missing
fields), `PROFILE_OUT_OF_RANGE`, `TARGET_WEIGHT_REQUIRED` (weight loss needs a target),
`TARGET_CONFLICTS_WITH_GOAL`, `LOSS_NOT_RECOMMENDED`, `TARGET_BELOW_HEALTHY_RANGE`.

#### POST …/fitness-plan
Recalculate on the server and save the plan for a pace as the active plan.

Request: `{ "pace": "BALANCED" }` — omit `pace` to take the recommended one; it must be omitted
for a maintenance plan.

Response `201`: the saved plan (`targetKcal`, `proteinG`, `carbsG`, `fatG`, `waterMl`,
`weeklyRateKg`, `targetDate`, inputs used) plus `adviseProfessional`.

Errors (`422`): the options errors above, plus `PACE_NOT_APPLICABLE`, `PACE_UNAVAILABLE`, `NO_SAFE_PACE`.

#### GET …/fitness-plan
`{ "plan": <saved plan> }` for the active (most recent) plan, or `{ "plan": null }`.

#### GET …/fitness-plan/daily-nutrition?date=YYYY-MM-DD
Food eaten on one day (gym timezone; defaults to today) against the plan that was active that day.

Response `200`:
```json
{
  "date": "2026-11-23",
  "entries": 1,
  "eaten": { "kcal": 450, "proteinG": 20, "carbsG": 60, "fatG": 12 },
  "targets": { "kcal": 1930, "proteinG": 144, "carbsG": 217, "fatG": 54, "waterMl": 2800 },
  "remaining": { "kcal": 1480, "proteinG": 124, "carbsG": 157, "fatG": 42 }
}
```
`targets` and `remaining` are `null` when there is no saved plan.

#### POST …/fitness-plan/weigh-ins
Log the member's weight (member-only). Body: `{ "weightKg": 77.6 }` (30–300).
Updates the profile weight in the same transaction, then:
- `goalReached: true` when the active plan's goal weight is reached, within 0.5 kg. The plan is left as is.
- Otherwise, if weight moved **≥ 2 kg** since the active plan, the plan is recalculated at the same pace
  (or the recommended one if that pace is no longer allowed) and `planUpdated: true`.

Response `201`: `{ "weightKg", "loggedAt", "goalReached", "planUpdated", "plan" }`.

#### GET /gyms/:gymId/members/:memberId/weight-logs
Weight history, newest first. The member themself, or staff with `members.view`.

#### GET /gyms/:gymId/members/:memberId/ai/usage
Member AI used and left this calendar month (gym timezone).

Response `200`:
```json
{
  "resetsAt": "2026-11-30T16:00:00.000Z",
  "features": [
    { "feature": "workout_suggestion", "used": 1, "limit": 4, "remaining": 3 },
    { "feature": "workout_exercise_swap", "used": 0, "limit": 30, "remaining": 30 },
    { "feature": "exercise_instructions", "used": 0, "limit": 60, "remaining": 60 },
    { "feature": "meal_suggestion", "used": 0, "limit": 30, "remaining": 30 },
    { "feature": "analyse_meal_photo", "used": 0, "limit": 20, "remaining": 20 },
    { "feature": "analyse_meal_text", "used": 0, "limit": 60, "remaining": 60 }
  ]
}
```
Every member AI route returns `429 MEMBER_AI_LIMIT_REACHED` once that feature's monthly limit is used up.
A single-meal `ai/meal-suggestion` without explicit targets aims at what is left of today's plan,
bounded between 200 kcal and 40% of the day.

#### GET /gyms/:gymId/members/:memberId/food-logs?limit=20&date=YYYY-MM-DD
Most recent food logs. `limit` is 1–100 (default 20). `date` limits the list to that day in the
gym's timezone.

---

### Check-ins

#### POST /gyms/:gymId/checkins
Check in a member.

**Requires `checkins.manage` permission.**

Request:
```json
{
  "method": "MANUAL_STAFF",
  "memberId": "<memberId>"
}
```

`method` values: `MANUAL_STAFF` | `QR_STAFF_SCAN` | `QR_SELF_SCAN` | `APP_SELF_CHECKIN`

For `QR_STAFF_SCAN` and `QR_SELF_SCAN`, send `qrCodeToken` instead of `memberId`.

Response `201`:
```json
{
  "id": "<checkInId>",
  "memberId": "<memberId>",
  "checkedInAt": "2026-04-20T10:00:00Z",
  "method": "MANUAL_STAFF",
  "isOutOfHours": false
}
```

Errors:
- `409 ALREADY_CHECKED_IN`
- `403 MEMBERSHIP_EXPIRED`
- `403 MEMBERSHIP_SUSPENDED`
- `403 GYM_CLOSED`

---

#### PATCH /gyms/:gymId/checkins/:id/checkout
Manually check out a member.

**Requires `checkins.manage` permission.**

Response `200`:
```json
{ "id": "...", "checkedOutAt": "2026-04-20T14:00:00Z" }
```

---

#### GET /gyms/:gymId/checkins/active
List members currently in the gym (no checkout yet).

**Requires `checkins.view` permission.**

Response `200`: array of active check-in objects.

---

#### GET /gyms/:gymId/checkins
Check-in history (paginated).

**Requires `checkins.view` permission.**

Query params: `page`, `limit`, `memberId`, `from` (ISO date), `to` (ISO date).

Response `200`: paginated check-in history.

---

### Renewals

#### POST /gyms/:gymId/members/:id/renew
Renew a member's membership.

**Requires `members.manage` permission.**

Request:
```json
{ "planId": "<planId>" }
```

Response `201`:
```json
{
  "id": "<renewalId>",
  "memberId": "<memberId>",
  "newExpiryDate": "2026-06-20",
  "renewedAt": "2026-04-20T10:00:00Z"
}
```

---

#### GET /gyms/:gymId/members/:id/renewals
Renewal history for a member.

**Requires `members.view` permission.**

Response `200`: array of renewal records.

---

### Announcements

#### GET /gyms/:gymId/announcements
List announcements.

**Requires auth.**

Visibility rules:
- Staff with `announcements.manage` → all statuses (filter with `?status=DRAFT`)
- Everyone else → `PUBLISHED` only

Query params:
- `status` — `DRAFT` | `SCHEDULED` | `PUBLISHED` | `EXPIRED` | `ARCHIVED` (staff only)

Response `200`:
```json
[
  {
    "id": "<announcementId>",
    "title": "Gym closes early Friday",
    "content": "We will close at 5pm this Friday.",
    "status": "PUBLISHED",
    "isPinned": false,
    "publishAt": "2026-04-20T08:00:00Z",
    "expiresAt": null,
    "createdByUser": { "id": "...", "fullName": "Dev Manager" },
    "createdAt": "2026-04-19T10:00:00Z"
  }
]
```

Pinned announcements always appear first.

---

#### POST /gyms/:gymId/announcements
Create an announcement.

**Requires `announcements.manage` permission.**

Request:
```json
{
  "title": "Friday Closure",
  "content": "We close at 5pm this Friday.",
  "isPinned": false,
  "publishAt": null,
  "expiresAt": "2026-04-25T00:00:00Z"
}
```

`publishAt` rules:
- `null` or past → status set to `PUBLISHED` immediately
- Future ISO date → status set to `SCHEDULED`

Response `201`: created announcement object.

---

#### PATCH /gyms/:gymId/announcements/:id
Update an announcement.

**Requires `announcements.manage` permission.**

Cannot update `EXPIRED` or `ARCHIVED` announcements.

Request (all fields optional):
```json
{
  "title": "Updated title",
  "isPinned": true,
  "publishAt": "2026-04-21T09:00:00Z"
}
```

Response `200`: updated announcement.

Errors:
- `409 ANNOUNCEMENT_NOT_EDITABLE`

---

#### DELETE /gyms/:gymId/announcements/:id
Archive an announcement.

**Requires `announcements.manage` permission.**

Can archive `DRAFT`, `SCHEDULED`, or `PUBLISHED`. Cannot archive `EXPIRED` or already `ARCHIVED`.

Response `200`:
```json
{ "id": "...", "status": "ARCHIVED" }
```

Errors:
- `409 ANNOUNCEMENT_NOT_ARCHIVABLE`

---

#### POST /gyms/:gymId/announcements/:id/read
Mark a `PUBLISHED` announcement as read by the caller.

**Requires auth. Idempotent — safe to call multiple times.**

Response `200`:
```json
{ "ok": true }
```

Errors:
- `404 ANNOUNCEMENT_NOT_FOUND` — not found or not `PUBLISHED`

---

### Chat (REST)

REST endpoints for loading message history. Real-time messaging uses WebSocket (see below).

The `conversationId` for the default community chat can be retrieved from the gym detail or stored client-side after first load.

**Dev fixture conversation ID: `00000000-0000-0000-0000-000000000008`**

---

#### GET /gyms/:gymId/conversations/:conversationId/messages
Load message history (paginated, newest first).

**Requires auth. Caller must be a conversation member.**

Query params:
- `limit` — number of messages to return (default 50, max 100)
- `before` — ISO-8601 timestamp; returns messages sent before this point (cursor)

Response `200`:
```json
[
  {
    "id": "<msgId>",
    "conversationId": "<convId>",
    "senderId": "<userId>",
    "type": "TEXT",
    "content": "Hello everyone!",
    "isDeleted": false,
    "isPinned": false,
    "sentAt": "2026-04-20T10:00:00Z",
    "editedAt": null,
    "sender": { "id": "...", "fullName": "Dev Manager" },
    "reactions": [
      { "userId": "...", "emoji": "👍", "reactedAt": "..." }
    ],
    "replyTo": null
  }
]
```

Deleted messages still appear in history with `content: null` and `isDeleted: true`.
Render them as _"This message was deleted"_.

Pagination: to load older messages, pass the `sentAt` of the oldest message in the current batch as `before`.

---

#### POST /gyms/:gymId/conversations/:conversationId/messages
Send a message via REST (alternative to WebSocket).

**Requires auth. Members must have `ACTIVE` membership.**

Request:
```json
{
  "content": "Hello!",
  "replyToId": "<msgId-optional>"
}
```

Response `201`: created message object.

Errors:
- `403 NOT_CONVERSATION_MEMBER`
- `403 MEMBERSHIP_NOT_ACTIVE`
- `404 CONVERSATION_NOT_FOUND`

---

#### DELETE /gyms/:gymId/conversations/:conversationId/messages/:msgId
Soft-delete a message.

**Requires auth. Only sender or staff with `chat.manage` permission.**

Response `200`:
```json
{ "id": "...", "isDeleted": true }
```

Errors:
- `404 MESSAGE_NOT_FOUND`
- `403 MESSAGE_CANNOT_DELETE`

---

#### POST /gyms/:gymId/conversations/:conversationId/messages/:msgId/react
Toggle an emoji reaction (add if absent, remove if present).

**Requires auth. Caller must be a conversation member.**

Request:
```json
{ "emoji": "👍" }
```

Response `200`:
```json
{ "action": "added", "emoji": "👍" }
```
or
```json
{ "action": "removed", "emoji": "👍" }
```

---

#### POST /gyms/:gymId/conversations/:conversationId/read
Update `last_read_at` to now. Used to track unread count.

**Requires auth. Caller must be a conversation member.**

Response `200`:
```json
{ "lastReadAt": "2026-04-20T10:05:00Z" }
```

---

## WebSocket — Real-time Chat

The WebSocket gateway runs on the `/chat` namespace. It handles real-time message delivery alongside the REST endpoints.

**Use REST for:** loading history, initial page load.
**Use WebSocket for:** sending messages, receiving new messages, reactions, deletions.

---

### Connection

```js
import { io } from 'socket.io-client';

const socket = io('http://localhost:9001/chat', {
  auth: { token: '<gym-jwt>' },   // gym JWT — org tokens are rejected
  transports: ['websocket'],
});

socket.on('connect', () => console.log('Connected'));
socket.on('error', (err) => console.error(err)); // { code, message }
socket.on('disconnect', () => console.log('Disconnected'));
```

If the token is invalid or expired, the server emits `error` and disconnects.

---

### Client → Server events

All events use the **acknowledgement** pattern — the second argument to `socket.emit` is a callback with the server's response.

```js
socket.emit('<event>', payload, (ack) => {
  if (ack.error) { /* handle error */ }
  else { /* ack.ok === true */ }
});
```

---

#### `join`
Subscribe to a conversation room. Must be called before receiving real-time events for a conversation.

```js
socket.emit('join', { conversationId: '<id>' }, (ack) => {
  // ack: { ok: true } | { error: 'CONVERSATION_NOT_FOUND' | 'NOT_CONVERSATION_MEMBER' }
});
```

Call `join` for each conversation the client needs to receive events from. On reconnect, re-join all rooms.

---

#### `message.send`
Send a message. The server broadcasts `message.new` to all room members (including the sender).

```js
socket.emit('message.send', {
  conversationId: '<id>',
  content: 'Hello!',
  replyToId: '<msgId>',   // optional
}, (ack) => {
  // ack: { ok: true, message: { id, content, sender, sentAt, ... } }
  //    | { error: 'MEMBERSHIP_NOT_ACTIVE' | 'NOT_CONVERSATION_MEMBER' | ... }
});
```

---

#### `message.delete`
Soft-delete a message. The server broadcasts `message.deleted` to the room.

```js
socket.emit('message.delete', {
  conversationId: '<id>',
  messageId: '<msgId>',
}, (ack) => {
  // ack: { ok: true } | { error: 'MESSAGE_NOT_FOUND' | 'MESSAGE_CANNOT_DELETE' }
});
```

---

#### `message.react`
Toggle an emoji reaction. The server broadcasts `message.reaction` to the room.

```js
socket.emit('message.react', {
  conversationId: '<id>',
  messageId: '<msgId>',
  emoji: '👍',
}, (ack) => {
  // ack: { ok: true, action: 'added' | 'removed', emoji: '👍' }
  //    | { error: 'MESSAGE_NOT_FOUND' | 'NOT_CONVERSATION_MEMBER' }
});
```

---

#### `conversation.read`
Update `last_read_at` to now. No broadcast — per-user state only.

```js
socket.emit('conversation.read', { conversationId: '<id>' }, (ack) => {
  // ack: { ok: true, lastReadAt: '2026-04-20T10:05:00Z' }
  //    | { error: 'NOT_CONVERSATION_MEMBER' }
});
```

---

### Server → Client events

These events are broadcast to the conversation room.

---

#### `message.new`
A new message was sent by any room member.

```js
socket.on('message.new', (message) => {
  // message: full message object (same shape as REST response)
  // { id, conversationId, senderId, content, type, isDeleted, sentAt, sender, reactions, replyTo }
});
```

---

#### `message.deleted`
A message was soft-deleted.

```js
socket.on('message.deleted', ({ messageId, conversationId }) => {
  // Update the message in local state: content = null, isDeleted = true
  // Render as "This message was deleted"
});
```

---

#### `message.reaction`
A reaction was added or removed.

```js
socket.on('message.reaction', ({ messageId, conversationId, userId, action, emoji }) => {
  // action: 'added' | 'removed'
  // Update reaction list for that message in local state
});
```

---

### Recommended client flow

```
1. Connect to /chat with JWT
2. Load message history via REST GET .../messages (last 50)
3. emit 'join' for the conversation
4. Listen for 'message.new', 'message.deleted', 'message.reaction'
5. To send: emit 'message.send', add to local state from ack
6. On scroll up: load older messages via REST with before= cursor
7. On app foreground / tab focus: emit 'conversation.read'
```

---

## Permissions reference

| Permission | Grants access to |
|------------|-----------------|
| `members.view` | Member list and detail: name and status only |
| `members.details` | Contact details, plan, prices, renewals, fitness profile, QR, weight logs |
| `members.create` / `members.edit` / `members.renew` / `members.suspend` / `members.delete` | Member operations |
| `staff.manage` | Invite, deactivate, assign roles to staff |
| `plans.manage` | Create and update membership plans |
| `checkins.view` | View check-in history and active list |
| `checkins.manage` | Create and close check-ins |
| `announcements.manage` | Create, update, archive announcements |
| `chat.manage` | Delete any message in community chat |
| `gym.manage` | Update gym profile and schedules |

Permissions are derived from roles at login and refresh, and embedded in the JWT. `OWNER` has every permission;
the Staff and Trainer sets are in `docs/02-domains/staff-and-rbac.md`. The full key list is the `Permission` enum.
Lift ladders (`GET/PUT badges/ladders`) need `leaderboard.manage`.

---

## Dev fixture IDs

Stable across re-seedings. Safe to use in Postman collections and tests.

| Entity | ID |
|--------|----|
| Organization | `00000000-0000-0000-0000-000000000001` |
| Gym | `00000000-0000-0000-0000-000000000002` |
| Owner user (manager@devgym.com) | `00000000-0000-0000-0000-000000000003` |
| Staff user (staff@devgym.com) | `00000000-0000-0000-0000-00000000000a` |
| Trainer user (trainer@devgym.com) | `00000000-0000-0000-0000-00000000000b` |
| Member user (member@devgym.com) | `00000000-0000-0000-0000-000000000004` |
| gym_staff record | `00000000-0000-0000-0000-000000000005` |
| gym_members record | `00000000-0000-0000-0000-000000000006` |
| Membership plan | `00000000-0000-0000-0000-000000000007` |
| Community conversation | `00000000-0000-0000-0000-000000000008` |

Credentials:
- `manager@devgym.com` / `Password123!` — OWNER, all permissions
- `staff@devgym.com` / `Password123!` — STAFF
- `trainer@devgym.com` / `Password123!` — TRAINER (members' name and status only)
- `member@devgym.com` / `Password123!` — ACTIVE member

### Badges v2

Badges belong to one of three categories: `CONSISTENCY`, `LOYALTY` or `STRENGTH`. A member can equip
one badge per category, so three at most; the database enforces this.

#### GET /gyms/:gymId/members/:memberId/badges/collection
Every badge the gym offers, grouped by category. The member themself, or staff with `members.view`.

Before answering, the API:
- creates default ladders for leaderboard lifts that have none;
- awards any badges the member already qualifies for.

Response `200`: `{ earnedCount, totalCount, categories: [{ category, equipped, badges }] }`.

Each badge has:
- `key` (`catalog:<id>`, `milestone:<id>` or `custom:<id>`);
- `category`, `name`, `description`, `icon`, `color`;
- `tier` (BRONZE / SILVER / GOLD for ladder rungs and cycle wins);
- `exercise` (for ladders and milestones);
- `earned` (`{ memberBadgeId, awardedAt, expiresAt, expired, isEquipped, seenAt }`, or `null` when locked);
- `timesEarned`;
- `progress` (`{ current, target, unit }`, or `null`);
- `rarityPct` (the share of active members who hold it) and `rarity` (see below). Both are cached for 15 minutes.

#### PATCH /gyms/:gymId/badges/my/:badgeId
`{ "equipped": true }` equips the badge and unequips the member's other badge in the same category.
`false` unequips it; expired badges can always be unequipped.

#### POST /gyms/:gymId/badges/my/seen
`{ "badgeIds": [<memberBadgeId>, …] }` (1–50 ids) marks the "new badge" celebration as seen.
New badges have `seenAt: null`.

#### GET /gyms/:gymId/badges/equipped
`[{ userId, badges: [{ memberBadgeId, key, category, name, description, icon, color, tier, rarity, awardedAt }], badge }]`.
`badges` is in category order. `badge` (the first badge, old shape) is kept for app versions before Badges v2.
A member's own badge list (`GET badges/my`, `GET members/:memberId/badges`) also carries `rarity`.

#### Badge rarity
`rarity` is `LEGENDARY`, `EPIC` or `null`, based on the share of the gym's **active** members who hold the badge
(`modules/badges/domain/badge-rarity.ts`):
- `LEGENDARY`: 5% or less, in a gym with at least 20 active members.
- `EPIC`: 15% or less, in a gym with at least 10 active members.

Small gyms never get rare badges; otherwise every badge would look rare. Clients draw flames (legendary) or a
glow (epic) around the medal.

#### GET /gyms/:gymId/badges/ladders
For staff with `badges.manage`. Returns the gym's leaderboard lifts:
`[{ exercise, enabled, weights: { BRONZE, SILVER, GOLD } | null, suggested }]`.

#### PUT /gyms/:gymId/badges/ladders/:exerciseId
`{ "enabled": true, "bronzeKg": 60, "silverKg": 80, "goldKg": 100 }` sets a lift's ladder.
The weights must increase, otherwise `422 INVALID_LADDER`. `{ "enabled": false }` switches it off.

**How rungs are earned:**
- A rung is earned by an **approved** lift at or above its weight, using the actual weight lifted.
- One lift can earn several rungs.
- Saving a ladder (or creating the default when a lift joins the leaderboard) also credits lifts already approved.
- Members keep rungs they earned, even if the weights change later.

**Other changes:**
- `POST /gyms/:gymId/badges/custom` accepts an optional `category`; the default is `LOYALTY`.
- Awarding a custom badge now checks that the badge belongs to the gym.
- New badges trigger a push notification (`data.type: "BADGE_EARNED"`).
