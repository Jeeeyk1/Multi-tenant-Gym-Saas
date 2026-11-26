-- Seed : 005_dev_fixtures_members
-- Description: 24 extra DEVGYM members with a spread of badges, so badge rarity can be tried locally
--              (rare tiers need 10+ active members for Epic and 20+ for Legendary).
--              Dev-only: the "dev_fixtures" name makes apply-seeds skip it in production.
-- Idempotent: fixed ids and ON CONFLICT DO NOTHING.
--
-- Logins: member01@devgym.com … member24@devgym.com / Password123!
--
-- Result with the dev member, 25 active members:
--   First Step     20 holders (common)
--   First Month    22 holders (common)
--   On Fire         3 holders (12%, Epic), equipped by member01–03
--   Century Club    1 holder  (4%, Legendary), equipped by member04
--   Unstoppable     1 holder  (4%, Legendary): the dev member, unseen so the "new badge"
--                   celebration shows on next launch (equipped if their Consistency slot is free)
--   Two-Year Club   nobody (shows as Legendary in the collection, locked)

-- ─── Users ────────────────────────────────────────────────────────────────────
INSERT INTO users (id, email, password_hash, full_name, is_active, email_verified_at)
SELECT
  ('00000000-0000-0000-0001-' || lpad(n::text, 12, '0'))::uuid,
  'member' || lpad(n::text, 2, '0') || '@devgym.com',
  '$2b$10$VHVFBarsFNURbTrSh88jlO1VqsRTZLx5kZgTkQUajdhj4YzxGVaDW',
  (ARRAY['Alex', 'Bea', 'Carlo', 'Dana', 'Eli', 'Fran', 'Gio', 'Hana', 'Ivan', 'Jessa', 'Kiko', 'Lea',
         'Migs', 'Nina', 'Oscar', 'Pia', 'Quin', 'Rina', 'Sam', 'Tess', 'Uly', 'Vina', 'Wes', 'Yumi'])[n]
    || ' Test',
  true,
  NOW()
FROM generate_series(1, 24) AS n
ON CONFLICT (id) DO NOTHING;

-- ─── Gym members (DEVGYM, Monthly Plan) ───────────────────────────────────────
INSERT INTO gym_members (id, gym_id, user_id, membership_plan_id, membership_number, status, expiry_date, joined_at, qr_code_token)
SELECT
  ('00000000-0000-0000-0002-' || lpad(n::text, 12, '0'))::uuid,
  '00000000-0000-0000-0000-000000000002',
  ('00000000-0000-0000-0001-' || lpad(n::text, 12, '0'))::uuid,
  '00000000-0000-0000-0000-000000000007',
  'MBR-DEVT' || lpad(n::text, 2, '0'),
  'ACTIVE',
  NOW() + INTERVAL '90 days',
  NOW() - (n * INTERVAL '9 days'),
  'devqrtest' || lpad(n::text, 55, '0')
FROM generate_series(1, 24) AS n
ON CONFLICT (id) DO NOTHING;

INSERT INTO member_privacy (member_id)
SELECT ('00000000-0000-0000-0002-' || lpad(n::text, 12, '0'))::uuid
FROM generate_series(1, 24) AS n
ON CONFLICT (member_id) DO NOTHING;

-- ─── Badges ───────────────────────────────────────────────────────────────────
-- All marked seen so the test accounts don't open on a celebration.
WITH spread(n, key, equipped) AS (
  SELECT n, 'FIRST_STEP', false FROM generate_series(1, 20) AS n
  UNION ALL SELECT n, 'MEMBER_1M', false FROM generate_series(1, 22) AS n
  UNION ALL SELECT n, 'ON_FIRE', true FROM generate_series(1, 3) AS n
  UNION ALL SELECT 4, 'CENTURY', true
)
INSERT INTO member_badges (member_id, gym_id, badge_catalog_id, category, source, is_equipped, seen_at)
SELECT
  ('00000000-0000-0000-0002-' || lpad(s.n::text, 12, '0'))::uuid,
  '00000000-0000-0000-0000-000000000002',
  bc.id,
  bc.category,
  'AUTO_SYSTEM',
  s.equipped,
  NOW()
FROM spread s
JOIN badge_catalog bc ON bc.key = s.key
ON CONFLICT DO NOTHING;

-- The dev member's own legendary badge, not yet seen. Equipped only if their Consistency slot is free;
-- otherwise the celebration's Equip button swaps it in.
INSERT INTO member_badges (member_id, gym_id, badge_catalog_id, category, source, is_equipped, seen_at)
SELECT
  '00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000002', bc.id, bc.category, 'AUTO_SYSTEM',
  NOT EXISTS (
    SELECT 1 FROM member_badges mb
    WHERE mb.member_id = '00000000-0000-0000-0000-000000000006' AND mb.category = bc.category AND mb.is_equipped
  ),
  NULL
FROM badge_catalog bc
WHERE bc.key = 'UNSTOPPABLE'
ON CONFLICT DO NOTHING;

-- ─── Community chat ───────────────────────────────────────────────────────────
-- A few messages so badges show next to names in chat.
INSERT INTO conversation_members (conversation_id, user_id, role)
SELECT '00000000-0000-0000-0000-000000000008', ('00000000-0000-0000-0001-' || lpad(n::text, 12, '0'))::uuid, 'MEMBER'
FROM generate_series(1, 24) AS n
ON CONFLICT (conversation_id, user_id) DO NOTHING;

INSERT INTO messages (id, conversation_id, sender_id, content, sent_at)
VALUES
  ('00000000-0000-0000-0003-000000000001', '00000000-0000-0000-0000-000000000008',
   '00000000-0000-0000-0001-000000000004', 'Hit my 100th session today 💪', NOW() - INTERVAL '3 hours'),
  ('00000000-0000-0000-0003-000000000002', '00000000-0000-0000-0000-000000000008',
   '00000000-0000-0000-0001-000000000001', 'Congrats! 7 days in a row for me', NOW() - INTERVAL '2 hours'),
  ('00000000-0000-0000-0003-000000000003', '00000000-0000-0000-0000-000000000008',
   '00000000-0000-0000-0001-000000000010', 'Anyone up for legs tomorrow at 6?', NOW() - INTERVAL '1 hour')
ON CONFLICT (id) DO NOTHING;
