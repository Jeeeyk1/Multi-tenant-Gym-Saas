# End-to-End Flows

This document describes every user journey from start to finish, with the exact API call the frontend makes at each step.

Read this before building any screen. All endpoints are fully documented in `docs/04-api/api-reference.md`.

---

## What is built (API status)

All backend phases are complete. The frontend can consume every flow below today.

| Domain | Status | Key endpoints |
|--------|--------|---------------|
| Auth | ✅ Done | login, refresh, logout, activate, resolve-code |
| Gym setup | ✅ Done | profile, schedules |
| Staff management | ✅ Done | invite, deactivate, assign roles |
| Membership plans | ✅ Done | create, update, list |
| Members | ✅ Done | register, list, detail, suspend, reactivate, QR |
| Check-ins | ✅ Done | check-in, checkout, active list, history |
| Renewals | ✅ Done | renew, renewal history |
| Announcements | ✅ Done | create, update, archive, list, mark read |
| Community chat (REST) | ✅ Done | list messages, send, delete, react, mark read |
| Community chat (WebSocket) | ✅ Done | real-time via Socket.IO `/chat` namespace |
| Cron jobs | ✅ Done | auto-expire, auto-suspend, auto-checkout, publish scheduled announcements |

---

## Actors

| Actor | Token type | What they do |
|-------|-----------|--------------|
| Org owner | Org JWT | Creates gyms, manages subscriptions (future) |
| Manager / Staff | Gym JWT | Runs day-to-day gym operations |
| Member | Gym JWT | Uses the gym — check-in, chat, announcements |

---

## Flow 1 — Entry screen (before login)

The entry screen asks for a code. The code can be an org slug or a gym code.

```
User types code → frontend resolves it → shows the right login form
```

**Step 1: Resolve the code**
```
POST /auth/resolve-code
{ "code": "DEVGYM" }

→ { "type": "gym", "gymId": "...", "gymName": "Dev Gym", "logoUrl": null }
```
or
```
→ { "type": "org", "organizationId": "...", "organizationName": "Dev Organization" }
```

The response tells the frontend which login form to show — gym login or org login.

---

## Flow 2 — Gym login (staff or member)

```
POST /auth/gym/login
{ "gymCode": "DEVGYM", "email": "manager@devgym.com", "password": "Password123!" }

→ { "accessToken": "...", "refreshToken": "...", "user": { "id", "email", "fullName" } }
```

**Store both tokens.** The access token expires in 15 minutes. Use the refresh token to get a new pair silently.

**Token refresh (silent, in background):**
```
POST /auth/refresh
{ "refreshToken": "..." }
→ { "accessToken": "...", "refreshToken": "..." }
```

After login, the frontend should decode the JWT to read the user's `roles` and `permissions` — these control what UI elements are visible.

---

## Flow 3 — Gym setup (manager, first time)

After a gym is created (by the org owner or admin), the manager logs in and configures it.

**Step 1: Fetch gym detail**
```
GET /gyms/:gymId
→ gym object with profile and schedules
```

**Step 2: Update gym profile**
```
PATCH /gyms/:gymId/profile
{ "description": "The best gym in town", "contactEmail": "hello@mygym.com" }
```

**Step 3: Set opening hours**
```
PATCH /gyms/:gymId/schedules
{
  "schedules": [
    { "dayOfWeek": 0, "isClosed": false, "openTime": "06:00", "closeTime": "22:00" },
    { "dayOfWeek": 6, "isClosed": true }
  ]
}
```

**Step 4: Create membership plans**
```
POST /gyms/:gymId/plans
{ "name": "Monthly", "type": "MONTHLY", "price": 1500, "durationDays": 30 }

POST /gyms/:gymId/plans
{ "name": "Annual", "type": "ANNUAL", "price": 15000, "durationDays": 365 }
```

**Step 5: Invite staff**
```
POST /gyms/:gymId/staff
{ "email": "frontdesk@mygym.com", "fullName": "Front Desk", "phone": "+639..." }
```
An invitation email is sent. The staff member must activate their account (Flow 5).

---

## Flow 4 — Member registration

Staff registers a new member from the management dashboard.

**Step 1: List available plans** (populate the plan picker)
```
GET /gyms/:gymId/plans
→ [ { id, name, price, durationDays }, ... ]
```

**Step 2: Register the member**
```
POST /gyms/:gymId/members
{
  "email": "jane@example.com",
  "fullName": "Jane Doe",
  "phone": "+639171234567",
  "planId": "<planId>"
}

→ {
    "id": "<memberId>",
    "membershipNumber": "MBR-00001",
    "status": "ACTIVE",
    "expiryDate": "2026-05-20",
    "qrCodeToken": "<token>"
  }
```

What the system does automatically:
- Creates a `users` record
- Creates a `gym_members` record with `status = ACTIVE`
- Calculates `expiry_date` from the plan's `durationDays`
- Generates a globally unique `membership_number`
- Generates a `qr_code_token` for QR check-in
- Enrolls the member in the gym's community conversation
- Sends an invitation email with an activation link

---

## Flow 5 — Account activation (new staff or member)

After registration, the user receives an email with a one-time activation link containing a `token`.

```
POST /auth/activate
{ "token": "<from-email-link>", "password": "NewPassword123!" }
→ 204 No Content
```

After activation, the user can log in normally.

---

## Flow 6 — Member experience (daily)

### 6a — Member logs in
Same as Flow 2 — `POST /auth/gym/login` with member credentials.

After login, decode the JWT to confirm `type = "gym"`.

### 6b — Member views announcements
```
GET /gyms/:gymId/announcements
→ [ { id, title, content, isPinned, publishAt, createdByUser, ... } ]
```

Pinned announcements appear first. Only `PUBLISHED` announcements are returned for members.

**Mark as read (call when member opens an announcement):**
```
POST /gyms/:gymId/announcements/:announcementId/read
→ { "ok": true }
```

### 6c — Member self check-in (app button)
```
POST /gyms/:gymId/checkins
{ "method": "APP_SELF_CHECKIN", "memberId": "<memberId from JWT sub>" }

→ { "id": "<checkInId>", "checkedInAt": "...", "method": "APP_SELF_CHECKIN" }
```

Possible errors:
- `409 ALREADY_CHECKED_IN` — member is already inside
- `403 MEMBERSHIP_EXPIRED` — membership expired
- `403 MEMBERSHIP_SUSPENDED` — account suspended
- `403 GYM_CLOSED` — gym is closed right now

### 6d — Member views community chat

**Load history first (REST):**
```
GET /gyms/:gymId/conversations/:conversationId/messages?limit=50
→ [ { id, content, sender, reactions, sentAt, replyTo }, ... ]
```

Messages are returned newest-first. Load older messages by passing the `sentAt` of the oldest message as `before`:
```
GET /gyms/:gymId/conversations/:conversationId/messages?limit=50&before=2026-04-20T10:00:00.000Z
```

**Then connect WebSocket for real-time:**
```js
const socket = io('http://api-host/chat', {
  auth: { token: accessToken }
});

socket.on('connect', () => {
  socket.emit('join', { conversationId }, (ack) => {
    // ack: { ok: true }
  });
});

// Receive new messages from everyone in the room
socket.on('message.new', (message) => {
  // prepend to local message list
});

// Receive deletions
socket.on('message.deleted', ({ messageId }) => {
  // update message: content = null, isDeleted = true
});

// Receive reactions
socket.on('message.reaction', ({ messageId, userId, action, emoji }) => {
  // update reaction list for that message
});
```

**Send a message:**
```js
socket.emit('message.send', {
  conversationId,
  content: 'Hello everyone!'
}, (ack) => {
  // ack.message = the saved message object
});
```

**Mark as read when member opens chat:**
```js
socket.emit('conversation.read', { conversationId });
```

---

## Flow 7 — Staff daily operations

### 7a — Staff logs in
```
POST /auth/gym/login
{ "gymCode": "DEVGYM", "email": "manager@devgym.com", "password": "Password123!" }
```

### 7b — Staff views active check-ins (gym floor view)
```
GET /gyms/:gymId/checkins/active
→ [ { id, member, checkedInAt, method }, ... ]
```

This is the live list of who is currently inside the gym. Refresh every 30s or pair with a WebSocket event (future enhancement).

### 7c — Staff manually checks in a member
```
POST /gyms/:gymId/checkins
{ "method": "MANUAL_STAFF", "memberId": "<memberId>" }
```

### 7d — Staff scans a member's QR code
```
POST /gyms/:gymId/checkins
{ "method": "QR_STAFF_SCAN", "qrCodeToken": "<scanned-token>" }
```

### 7e — Staff checks out a member
```
PATCH /gyms/:gymId/checkins/:checkInId/checkout
→ { "id": "...", "checkedOutAt": "..." }
```

### 7f — Staff views members list
```
GET /gyms/:gymId/members?page=1&limit=20&status=ACTIVE
→ { data: [...], total, page, limit }
```

Filter options: `status=ACTIVE|EXPIRED|SUSPENDED`, `search=<name or email>`

### 7g — Staff views a member's detail
```
GET /gyms/:gymId/members/:memberId
→ full member object with plan, renewal history
```

### 7h — Staff gets a member's QR token (to display or print)
```
GET /gyms/:gymId/members/:memberId/qr
→ { "qrCodeToken": "..." }
```

The frontend renders this token as a QR code using any QR library.

### 7i — Staff posts an announcement
```
POST /gyms/:gymId/announcements
{
  "title": "Gym closes early this Friday",
  "content": "We will close at 5pm. Sorry for the inconvenience.",
  "isPinned": false
}
```

To schedule for later:
```
POST /gyms/:gymId/announcements
{
  "title": "New Year Promo",
  "content": "50% off annual memberships!",
  "publishAt": "2027-01-01T00:00:00.000Z",
  "expiresAt": "2027-01-31T23:59:59.000Z"
}
```

---

## Flow 8 — Membership renewal

### Renewal by staff
```
POST /gyms/:gymId/members/:memberId/renew
{ "planId": "<planId>", "amountPaid": 1500, "paymentMethod": "CASH" }

→ { "id": "<renewalId>", "newExpiryDate": "2026-06-20", "renewedAt": "..." }
```

The system extends `expiry_date` from the greater of `now()` or the current expiry. The member's status stays or returns to `ACTIVE`.

### View renewal history
```
GET /gyms/:gymId/members/:memberId/renewals
→ [ { id, planId, amountPaid, paymentMethod, newExpiryDate, renewedAt }, ... ]
```

---

## Flow 9 — Suspend and reactivate a member

### Suspend
```
PATCH /gyms/:gymId/members/:memberId/suspend
→ { "id": "...", "status": "SUSPENDED" }
```

A suspended member cannot log in or check in. The account is not deleted.

### Reactivate
```
PATCH /gyms/:gymId/members/:memberId/reactivate
→ { "id": "...", "status": "ACTIVE" }
```

---

## Flow 10 — What the background cron jobs do automatically

These run without any frontend action. Frontend just reflects the results on next data fetch.

| Job | Schedule | What it does |
|-----|----------|--------------|
| Membership expiry | Every 10 min | Finds `gym_members` where `expiry_date < now()` and `status = ACTIVE` → sets `status = EXPIRED` |
| Auto-suspend | Every hour | Finds `status = EXPIRED` members expired > N months → sets `status = SUSPENDED` |
| Auto-checkout | Every 30 min | Finds check-ins open > configured hours → sets `checked_out_at = now()` |
| Announcement publisher | Every 5 min | Finds `SCHEDULED` announcements where `publish_at <= now()` → sets `status = PUBLISHED`; finds `PUBLISHED` where `expires_at <= now()` → sets `status = EXPIRED` |

---

## Flow 11 — Token refresh and logout

### Silent refresh (run before each request if token is about to expire)
```
POST /auth/refresh
{ "refreshToken": "..." }
→ { "accessToken": "...", "refreshToken": "..." }
```

### Logout
```
POST /auth/logout
{ "refreshToken": "..." }
→ 204 No Content
```

After logout: clear both tokens from storage, disconnect the WebSocket, redirect to entry screen.

---

## Frontend screen-to-flow mapping

| Screen | Flows used |
|--------|-----------|
| Entry / code input | Flow 1 |
| Login | Flow 2 |
| Dashboard (staff) | Flow 7b (active check-ins) |
| Member list | Flow 7f |
| Member detail | Flow 7g, 7h, 8, 9 |
| Register member | Flow 4 |
| Check-in (manual) | Flow 7c |
| Check-in (QR scan) | Flow 7d |
| Announcements (staff) | Flow 7i, list with all statuses |
| Announcements (member) | Flow 6b |
| Community chat | Flow 6d (REST + WebSocket) |
| Membership plans | Flow 3 step 4 |
| Gym settings | Flow 3 steps 2–3 |
| Account activation | Flow 5 |
| Self check-in (member app) | Flow 6c |

---

## Error handling — what the frontend must handle

Every error response has this shape:
```json
{ "statusCode": 403, "error": "Forbidden", "code": "PERMISSION_DENIED", "message": "..." }
```

Always handle by `code`, not by `message` or `statusCode` alone.

| Code | When | What to show |
|------|------|-------------|
| `INVALID_CREDENTIALS` | Login fails | "Wrong email or password" |
| `INVALID_REFRESH_TOKEN` | Refresh fails | Force logout, redirect to login |
| `ALREADY_CHECKED_IN` | Check-in | "This member is already inside" |
| `MEMBERSHIP_EXPIRED` | Check-in | "Membership has expired — please renew" |
| `MEMBERSHIP_SUSPENDED` | Check-in | "This account has been suspended" |
| `GYM_CLOSED` | Check-in | "The gym is currently closed" |
| `PERMISSION_DENIED` | Any | Hide the action — user lacks permission |
| `GYM_ACCESS_DENIED` | Any | Token is for the wrong gym |
| `ANNOUNCEMENT_NOT_EDITABLE` | Update announcement | "Cannot edit expired or archived announcements" |
| `NOT_CONVERSATION_MEMBER` | Chat | Member is not in this conversation |
| `MEMBERSHIP_NOT_ACTIVE` | Chat send | Member cannot send messages — membership is not active |
| `MESSAGE_CANNOT_DELETE` | Chat delete | "You can only delete your own messages" |
| `UNAUTHORIZED` (WebSocket) | Connect | JWT missing or expired — reconnect after refresh |
