-- Migration : 0015_indexes
-- Description: All performance indexes across every domain
-- Applied by : db/scripts/apply-migrations.ts
--
-- The partial unique index on check_ins(member_id) WHERE checked_out_at IS NULL
-- is defined in 0011_check_ins.sql as it is a constraint, not just a perf index.

-- ─────────────────────────────────────────────────────────────────────────────
-- IDENTITY
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX idx_users_email
  ON users (email);

CREATE INDEX idx_user_tokens_lookup
  ON user_tokens (token)
  WHERE is_used = false;

CREATE INDEX idx_refresh_tokens_lookup
  ON refresh_tokens (token_hash)
  WHERE is_revoked = false;

-- ─────────────────────────────────────────────────────────────────────────────
-- ORGANIZATION & GYM
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX idx_organizations_slug
  ON organizations (slug);

CREATE INDEX idx_gyms_code
  ON gyms (code);

CREATE INDEX idx_gyms_org_status
  ON gyms (organization_id, status);

-- ─────────────────────────────────────────────────────────────────────────────
-- STAFF & RBAC
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX idx_gym_staff_user_gym
  ON gym_staff (user_id, gym_id)
  WHERE is_active = true;

-- ─────────────────────────────────────────────────────────────────────────────
-- MEMBERS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX idx_gym_members_qr
  ON gym_members (qr_code_token);

CREATE INDEX idx_gym_members_number
  ON gym_members (membership_number);

CREATE INDEX idx_gym_members_user
  ON gym_members (user_id);

CREATE INDEX idx_gym_members_expiry
  ON gym_members (gym_id, expiry_date, status);

-- Used by MembershipExpiryJob and AutoSuspendJob
CREATE INDEX idx_gym_members_status
  ON gym_members (status, expiry_date);

-- ─────────────────────────────────────────────────────────────────────────────
-- CHECK-INS
-- ─────────────────────────────────────────────────────────────────────────────

-- Real-time "who is in the gym" query
CREATE INDEX idx_check_ins_active
  ON check_ins (gym_id, checked_out_at)
  WHERE checked_out_at IS NULL;

-- Member visit history (most recent first)
CREATE INDEX idx_check_ins_member
  ON check_ins (member_id, checked_in_at DESC);

-- AutoCheckoutJob: find stale open check-ins
CREATE INDEX idx_check_ins_stale
  ON check_ins (checked_in_at)
  WHERE checked_out_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- CHAT
-- ─────────────────────────────────────────────────────────────────────────────

-- Paginated message feed (most recent first, excluding deleted)
CREATE INDEX idx_messages_feed
  ON messages (conversation_id, sent_at DESC)
  WHERE is_deleted = false;

-- Conversations a user belongs to
CREATE INDEX idx_conversation_members_user
  ON conversation_members (user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- ANNOUNCEMENTS
-- ─────────────────────────────────────────────────────────────────────────────

-- Member feed + AnnouncementPublisherJob queries
CREATE INDEX idx_announcements_gym_status
  ON announcements (gym_id, status, publish_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- BILLING
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX idx_subscriptions_org_status
  ON subscriptions (organization_id, status);

-- ─────────────────────────────────────────────────────────────────────────────
-- AI USAGE
-- ─────────────────────────────────────────────────────────────────────────────

-- Token sum per org per period (called before every AI request)
CREATE INDEX idx_ai_usage_org_date
  ON ai_usage_log (organization_id, used_at);
