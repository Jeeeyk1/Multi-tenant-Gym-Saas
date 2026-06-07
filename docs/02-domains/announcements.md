# Announcements Domain

## Purpose

The Announcements domain enables gym staff to communicate with members through structured broadcasts.

It is designed for:

- gym-wide communication
- important updates
- promotions
- reminders

This is a **one-way communication system** (staff → members).

---

## Core entities

### Announcement

Represents a broadcast message from staff.

Key fields:

- id
- gym_id
- created_by (staff user)
- title
- content
- status
- target_audience
- target_filters
- is_pinned
- publish_at
- expires_at
- created_at
- updated_at

---

### AnnouncementRead

Tracks which users have read an announcement.

Key fields:

- announcement_id
- user_id
- read_at

---

## Status lifecycle

Announcement status:

- DRAFT
- SCHEDULED
- PUBLISHED
- EXPIRED
- ARCHIVED

---

### State transitions

```text
DRAFT → PUBLISHED
DRAFT → SCHEDULED
SCHEDULED → PUBLISHED (via scheduler)
PUBLISHED → EXPIRED (via scheduler)
PUBLISHED → ARCHIVED (manual)

Core rules
1. Creation
Only staff with permission can create announcements.

System must:

associate announcement with gym_id
store creator (user_id)
default to DRAFT or PUBLISHED
2. Publishing
If:

publish_at is null → publish immediately
publish_at is set → set status = SCHEDULED
3. Scheduling
A background job must:

publish announcements when:
text


publish_at <= now
expire announcements when:
text


expires_at <= now
4. Expiry
Expired announcements:

are no longer active
should not appear in default feed
remain in database for history
Target audience
MVP behavior
For MVP:

text


target_audience = ALL
All members in gym receive announcement.

Future behavior
Support:

MEMBERSHIP_TYPE
EXPIRING_SOON
STAFF
Using:

json


target_filters: {}
Visibility rules
Who can see announcements
Members:

✅ ACTIVE → can see announcements
✅ EXPIRED → can still see announcements (recommended)
❌ SUSPENDED → cannot log in → cannot see
Recommendation (important)
Allow EXPIRED members to see announcements:

helps bring them back
supports renewal campaigns
Read tracking
When member views announcement:

create record in announcement_reads
prevents duplicate reads
enables unread count
Query behavior
Fetch announcements
text


WHERE gym_id = ?
AND status = PUBLISHED
Optional filters:

exclude expired
include pinned first
Unread count
text


announcement.created_at > last_read_at
Permissions
Required permission:

text


announcements.manage
Allows:

create
update
publish
archive
Pinning
Announcements can be pinned.

Rules:

pinned announcements appear first
limit number of pinned (future constraint)
Integration with other domains
Members
announcements are scoped per gym
visibility depends on member status
Staff & RBAC
only authorized staff can create/manage
Gym
all announcements belong to a gym
Edge cases
Scheduled announcement missed
scheduler must catch up and publish
Expired but still visible
must be filtered out
Deleted user (staff)
announcement remains, but created_by is historical
Invariants
announcement must belong to a gym
status must be valid
timestamps must be consistent
Future enhancements
targeted announcements
push notifications
read analytics
reactions/comments
attachments
Design goal
The Announcements domain must:

be simple and reliable
support scheduled communication
integrate cleanly with member lifecycle
avoid complexity in MVP
This domain supports:

engagement
retention
operational communication