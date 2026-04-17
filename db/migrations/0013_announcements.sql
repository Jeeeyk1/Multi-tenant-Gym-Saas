-- Migration : 0013_announcements
-- Description: Announcements domain — announcements, announcement_reads
-- Applied by : db/scripts/apply-migrations.ts

-- ─────────────────────────────────────────────────────────────────────────────
-- announcements
-- Structured one-way broadcasts from gym staff to members.
-- Completely separate from chat.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE announcements (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id          UUID         NOT NULL REFERENCES gyms (id) ON DELETE CASCADE,
  created_by      UUID         NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  title           VARCHAR(255) NOT NULL,
  content         TEXT         NOT NULL,
  status          VARCHAR(50)  NOT NULL DEFAULT 'DRAFT',
  -- 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'EXPIRED' | 'ARCHIVED'
  target_audience VARCHAR(50)  NOT NULL DEFAULT 'ALL',
  -- 'ALL'             : all active members
  -- 'MEMBERSHIP_TYPE' : specific membership types
  -- 'EXPIRING_SOON'   : members expiring within N days
  -- 'STAFF'           : staff only
  target_filters  JSONB        NOT NULL DEFAULT '{}',
  -- MEMBERSHIP_TYPE: { "membership_types": ["MONTHLY", "ANNUAL"] }
  -- EXPIRING_SOON:  { "days_until_expiry": 30 }
  -- ALL / STAFF:    {}
  is_pinned       BOOLEAN      NOT NULL DEFAULT false,
  publish_at      TIMESTAMPTZ,
  -- null = publish immediately when status set to PUBLISHED
  -- future timestamp = AnnouncementPublisherJob will set PUBLISHED when due
  expires_at      TIMESTAMPTZ,
  -- null = never expires
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT announcements_status_check CHECK (
    status IN ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'EXPIRED', 'ARCHIVED')
  ),
  CONSTRAINT announcements_audience_check CHECK (
    target_audience IN ('ALL', 'MEMBERSHIP_TYPE', 'EXPIRING_SOON', 'STAFF')
  )
);

-- ─────────────────────────────────────────────────────────────────────────────
-- announcement_reads
-- Tracks who has seen each announcement.
-- Powers unread badges and "seen by X members" for staff.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE announcement_reads (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID        NOT NULL REFERENCES announcements (id) ON DELETE CASCADE,
  user_id         UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  read_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT announcement_reads_unique UNIQUE (announcement_id, user_id)
);
