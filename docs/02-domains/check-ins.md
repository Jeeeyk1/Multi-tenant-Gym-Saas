# Check-Ins Domain

## Purpose

The Check-Ins domain tracks every gym visit.

It is responsible for:

- recording member attendance
- enforcing check-in rules
- preventing duplicate active sessions
- validating membership and gym availability
- enabling real-time “who is in the gym” features

---

## Core entity

### CheckIn

Represents a single gym visit.

Key fields:

- id
- member_id
- gym_id
- method
- processed_by
- checked_in_at
- checked_out_at
- is_out_of_hours
- is_auto_checkout

---

## Check-in methods

Supported methods:

- MANUAL_STAFF → staff searches member manually
- QR_STAFF_SCAN → staff scans member QR
- QR_SELF_SCAN → member scans gym QR
- APP_SELF_CHECKIN → member taps check-in in app

---

## Core rules

### 1. One active check-in per member

A member can only have one active check-in.

Active means:

```text
checked_out_at IS NULL
DB-level enforcement
sql


CREATE UNIQUE INDEX ux_checkins_member_active
ON check_ins(member_id)
WHERE checked_out_at IS NULL;
This prevents race conditions and duplicate check-ins.

2. Membership validation
Before check-in:

member must exist
member must belong to gym
membership status must be ACTIVE
expiry_date must be valid
3. Gym validation
gym must exist
gym must match tenant context
4. Schedule validation

If gym is 24/7 (`is_247 = true`):

- skip all schedule validation

If gym is NOT 24/7:

- check current day schedule against gym's timezone (not server UTC)
- if the gym is closed that day, OR current time is outside `open_time` / `close_time`:
  - **do NOT block the check-in**
  - set `is_out_of_hours = true` on the check-in record
  - check-in proceeds normally
- if within schedule: `is_out_of_hours = false`

Rationale: Hard blocking causes member lockouts when schedules are not kept up to date.
Flagging preserves the audit trail without breaking legitimate access.
5. Duplicate check-in prevention
System must reject if:

text


existing check_in where checked_out_at IS NULL
Check-in flow
QR Self Scan (primary)
Member scans gym QR
System resolves gym via QR token
System finds member record
Validation:

- membership ACTIVE
- not expired
- not already checked in

If valid:

- create check_in record
- set `is_out_of_hours = true` if outside schedule, `false` otherwise
Staff-assisted check-in
Staff searches member
Staff selects member
System validates same rules
System creates check-in
App check-in
Member taps check-in
System validates:
membership
gym
System creates check-in
## Check-out flow

### Manual checkout
Staff or member explicitly checks out. `checked_out_at` is set to the current timestamp. `is_auto_checkout = false`.

### Automatic checkout (cron)
A background job (`AutoCheckoutJob`) runs every 15 minutes and closes any open check-in where:

```
checked_out_at IS NULL
AND checked_in_at < now() - gym.auto_checkout_hours
```

When auto-closed:
- `checked_out_at` is set to the current timestamp
- `is_auto_checkout = true`

Default threshold: `5 hours`. Configurable per gym via `gyms.auto_checkout_hours`.

### Runtime safety net
At check-in time, if a member has an open check-in that is older than the gym's `auto_checkout_hours` threshold, the system auto-closes it before creating the new check-in. This handles the case where the cron job has not yet run.

If the open check-in is still within the threshold, the new check-in is rejected with "already checked in".

### Rules
- Only an active check-in (`checked_out_at IS NULL`) can be checked out
- `checked_out_at` is set once and never updated
- `is_auto_checkout` records whether it was system-initiated or manual
Presence tracking
A member is “currently in gym” when:

text


checked_out_at IS NULL
Query: active members
sql


SELECT *
FROM check_ins
WHERE gym_id = ?
AND checked_out_at IS NULL;
Privacy rules
Members can hide their presence.

System must:

exclude hidden members from member-visible list
include all members for staff
Feature access dependency
Check-in requires:

membership status = ACTIVE
user not suspended
user authenticated
Error cases

System must return an error for:

- Already checked in → reject
- Membership expired → reject
- Membership suspended → reject
- Member not found → reject
- Invalid QR token → reject

Note: Gym being outside schedule hours is NOT an error. It results in `is_out_of_hours = true` on the record.
Edge cases
Concurrent check-in attempts
DB unique index prevents duplicates
Staff + member simultaneous check-in
one succeeds
one fails
Expired member tries QR scan
must fail
Invalid gym QR
must fail
Member from another gym
must fail
Performance considerations
Required indexes
sql


CREATE INDEX idx_checkins_active
ON check_ins(gym_id, checked_out_at)
WHERE checked_out_at IS NULL;
CREATE INDEX idx_checkins_member
ON check_ins(member_id, checked_in_at DESC);
Query rules
never SELECT *
always filter by gym_id
always paginate historical queries
Integration with other domains

- Members: membership must be ACTIVE, expiry_date enforced
- Gym: schedule checked for flagging, timezone must be used (not server UTC)
- Staff: can perform manual check-in; can see all out-of-hours check-ins in dashboard
- Chat (future): presence may drive "who is in gym"
## Future enhancements

- session duration analytics (average visit length per member)
- peak hours heatmap
- real-time presence updates via websockets
Invariants
only one active check-in per member
check_in must always belong to a gym
check_in must always belong to a member
checked_out_at must be null or valid timestamp
Design goal
The Check-Ins domain must be:

consistent
race-condition safe
easy to reason about
fast for real-time queries
This domain is critical for:

gym operations
attendance tracking
member engagement features