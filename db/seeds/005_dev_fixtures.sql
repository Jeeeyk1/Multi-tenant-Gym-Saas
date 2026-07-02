-- Seed    : 005_dev_fixtures
-- Description: Local development fixtures — one org, one gym, one staff (MANAGER), one member
-- Environment: local development only
-- Idempotent: uses INSERT ... ON CONFLICT DO NOTHING / WHERE NOT EXISTS
--
-- Fixed credentials
--   Staff  : manager@devgym.com  / Password123!
--   Member : member@devgym.com   / Password123!
--
-- Fixed IDs (stable across re-seedings so Postman collection stays valid)
--   org         : 00000000-0000-0000-0000-000000000001
--   gym         : 00000000-0000-0000-0000-000000000002
--   staff user  : 00000000-0000-0000-0000-000000000003
--   member user : 00000000-0000-0000-0000-000000000004
--   gym_staff   : 00000000-0000-0000-0000-000000000005
--   gym_member  : 00000000-0000-0000-0000-000000000006
--   plan        : 00000000-0000-0000-0000-000000000007
--   conversation: 00000000-0000-0000-0000-000000000008

-- ─── Organization ────────────────────────────────────────────────────────────
INSERT INTO organizations (id, name, slug, status)
VALUES ('00000000-0000-0000-0000-000000000001', 'Dev Organization', 'dev-org', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- ─── Gym ─────────────────────────────────────────────────────────────────────
INSERT INTO gyms (id, organization_id, name, code, address, timezone, is_247, auto_checkout_hours, auto_suspend_months)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'Dev Gym',
  'DEVGYM',
  '123 Dev Street',
  'Asia/Manila',
  true,
  5,
  3
)
ON CONFLICT (id) DO NOTHING;

-- ─── Gym Profile ─────────────────────────────────────────────────────────────
INSERT INTO gym_profile (gym_id, description, contact_email)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'Development gym for local testing',
  'admin@devgym.com'
)
ON CONFLICT (gym_id) DO NOTHING;

-- ─── Gym Schedules (24/7 — all days open) ────────────────────────────────────
INSERT INTO gym_schedules (gym_id, day_of_week, is_closed, open_time, close_time)
VALUES
  ('00000000-0000-0000-0000-000000000002', 0, false, '00:00', '23:59'),
  ('00000000-0000-0000-0000-000000000002', 1, false, '00:00', '23:59'),
  ('00000000-0000-0000-0000-000000000002', 2, false, '00:00', '23:59'),
  ('00000000-0000-0000-0000-000000000002', 3, false, '00:00', '23:59'),
  ('00000000-0000-0000-0000-000000000002', 4, false, '00:00', '23:59'),
  ('00000000-0000-0000-0000-000000000002', 5, false, '00:00', '23:59'),
  ('00000000-0000-0000-0000-000000000002', 6, false, '00:00', '23:59')
ON CONFLICT (gym_id, day_of_week) DO NOTHING;

-- ─── Default Community Conversation ──────────────────────────────────────────
--   conversation : 00000000-0000-0000-0000-000000000008
INSERT INTO conversations (id, gym_id, type, name, is_default)
VALUES (
  '00000000-0000-0000-0000-000000000008',
  '00000000-0000-0000-0000-000000000002',
  'COMMUNITY',
  'Community',
  true
)
ON CONFLICT (id) DO NOTHING;

-- ─── Staff User (MANAGER) ─────────────────────────────────────────────────────
-- Password: Password123!  (bcrypt hash, cost 10)
INSERT INTO users (id, email, password_hash, full_name, is_active, email_verified_at)
VALUES (
  '00000000-0000-0000-0000-000000000003',
  'manager@devgym.com',
  '$2b$10$VHVFBarsFNURbTrSh88jlO1VqsRTZLx5kZgTkQUajdhj4YzxGVaDW',
  'Dev Manager',
  true,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ─── Gym Staff record ─────────────────────────────────────────────────────────
INSERT INTO gym_staff (id, gym_id, user_id, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003',
  true
)
ON CONFLICT (id) DO NOTHING;

-- ─── Assign MANAGER role to staff ─────────────────────────────────────────────
INSERT INTO gym_staff_roles (gym_staff_id, role_id)
SELECT
  '00000000-0000-0000-0000-000000000005',
  r.id
FROM roles r
WHERE r.name = 'MANAGER'
ON CONFLICT (gym_staff_id, role_id) DO NOTHING;

-- ─── Membership Plan ──────────────────────────────────────────────────────────
INSERT INTO membership_plans (id, gym_id, name, type, price, duration_days, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000007',
  '00000000-0000-0000-0000-000000000002',
  'Monthly Plan',
  'MONTHLY',
  1500.00,
  30,
  true
)
ON CONFLICT (id) DO NOTHING;

-- ─── Member User ──────────────────────────────────────────────────────────────
-- Password: Password123!  (bcrypt hash, cost 10)
INSERT INTO users (id, email, password_hash, full_name, is_active, email_verified_at)
VALUES (
  '00000000-0000-0000-0000-000000000004',
  'member@devgym.com',
  '$2b$10$VHVFBarsFNURbTrSh88jlO1VqsRTZLx5kZgTkQUajdhj4YzxGVaDW',
  'Dev Member',
  true,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ─── Gym Member ───────────────────────────────────────────────────────────────
-- DO UPDATE keeps expiry_date fresh so check-ins keep working in long-running dev envs.
INSERT INTO gym_members (id, gym_id, user_id, membership_plan_id, membership_number, status, expiry_date, qr_code_token)
VALUES (
  '00000000-0000-0000-0000-000000000006',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000007',
  'MBR-DEV001',
  'ACTIVE',
  NOW() + INTERVAL '365 days',
  'devqrtoken0000000000000000000000000000000000000000000000000000001'
)
ON CONFLICT (id) DO UPDATE SET
  status = 'ACTIVE',
  expiry_date = NOW() + INTERVAL '365 days';

-- ─── Member Privacy ───────────────────────────────────────────────────────────
INSERT INTO member_privacy (member_id)
VALUES ('00000000-0000-0000-0000-000000000006')
ON CONFLICT (member_id) DO NOTHING;

-- ─── Conversation Members ─────────────────────────────────────────────────────
-- Enrol both dev users in the community conversation so they can chat.
-- Staff gets MODERATOR role (can delete any message); member gets MEMBER role.
INSERT INTO conversation_members (conversation_id, user_id, role)
VALUES
  ('00000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000003', 'MODERATOR'),
  ('00000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000004', 'MEMBER')
ON CONFLICT (conversation_id, user_id) DO NOTHING;

-- ─── Subscription ─────────────────────────────────────────────────────────────
-- Puts the dev org on the Growth plan so the AI insights assistant (gated on the
-- 'ai_assistant' plan feature + monthly token quota) is available locally.
INSERT INTO subscriptions (id, organization_id, plan_id, status, billing_cycle, current_period_start, current_period_end)
SELECT
  '00000000-0000-0000-0000-000000000009',
  '00000000-0000-0000-0000-000000000001',
  p.id,
  'ACTIVE',
  'MONTHLY',
  date_trunc('month', now()),
  date_trunc('month', now()) + interval '1 month'
FROM plans p
WHERE p.tier = 'GROWTH'
ON CONFLICT (id) DO NOTHING;
