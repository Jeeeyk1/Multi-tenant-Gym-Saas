-- Migration : 0048_badges_v2
-- Description: Badge categories, three equipped slots, lift ladders, loyalty badges.
--              1. Every badge belongs to a category: CONSISTENCY, LOYALTY or STRENGTH.
--                 member_badges keeps a copy so "one equipped per category" can be a DB rule.
--              2. Milestone badges get a tier (BRONZE/SILVER/GOLD) so a lift can have a ladder.
--              3. Duplicate awards are removed and blocked for catalog and milestone badges.
--              4. member_badges.seen_at drives the "new badge" celebration.
--              5. Loyalty catalog badges for 1, 3, 6, 12 and 24 months as a member.
-- Applied by : db/scripts/apply-migrations.ts

-- 1. Categories -------------------------------------------------------------------------

ALTER TABLE badge_catalog
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'CONSISTENCY'
    CONSTRAINT badge_catalog_category_check CHECK (category IN ('CONSISTENCY', 'LOYALTY', 'STRENGTH'));

UPDATE badge_catalog SET category = 'LOYALTY'  WHERE key = 'FOUNDING_MEMBER';
UPDATE badge_catalog SET category = 'STRENGTH' WHERE key IN ('CYCLE_GOLD', 'CYCLE_SILVER', 'CYCLE_BRONZE');

ALTER TABLE gym_custom_badges
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'LOYALTY'
    CONSTRAINT gym_custom_badges_category_check CHECK (category IN ('CONSISTENCY', 'LOYALTY', 'STRENGTH'));

ALTER TABLE member_badges ADD COLUMN IF NOT EXISTS category TEXT;

UPDATE member_badges mb
SET category = COALESCE(
  (SELECT bc.category FROM badge_catalog bc WHERE bc.id = mb.badge_catalog_id),
  (SELECT cb.category FROM gym_custom_badges cb WHERE cb.id = mb.custom_badge_id),
  CASE WHEN mb.milestone_badge_id IS NOT NULL THEN 'STRENGTH' END,
  'CONSISTENCY'
);

ALTER TABLE member_badges
  ALTER COLUMN category SET NOT NULL,
  ADD CONSTRAINT member_badges_category_check CHECK (category IN ('CONSISTENCY', 'LOYALTY', 'STRENGTH'));

-- The old one-equipped rule lived only in app code, so a race could leave two equipped.
-- Keep the most recent per member and category before adding the rule.
UPDATE member_badges mb SET is_equipped = FALSE
FROM (
  SELECT id, row_number() OVER (PARTITION BY member_id, category ORDER BY awarded_at DESC, id DESC) AS rn
  FROM member_badges
  WHERE is_equipped
) d
WHERE mb.id = d.id AND d.rn > 1;

-- At most one equipped badge per category (three in total).
CREATE UNIQUE INDEX IF NOT EXISTS uq_member_badges_equipped_per_category
  ON member_badges (member_id, category)
  WHERE is_equipped;

-- 2. Lift ladders -----------------------------------------------------------------------

ALTER TABLE exercise_milestone_badges
  ADD COLUMN IF NOT EXISTS tier TEXT
    CONSTRAINT exercise_milestone_badges_tier_check CHECK (tier IN ('BRONZE', 'SILVER', 'GOLD'));

-- Ladders created automatically (when a lift joins the leaderboard) have no staff creator.
ALTER TABLE exercise_milestone_badges ALTER COLUMN created_by_user_id DROP NOT NULL;

-- One badge per tier per lift in a gym; untiered (custom) milestones are unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS uq_exercise_milestone_badges_tier
  ON exercise_milestone_badges (gym_id, exercise_id, tier)
  WHERE tier IS NOT NULL AND is_active;

-- 3. No duplicate awards ----------------------------------------------------------------
-- A check-in and a workout logged together could both award the same badge. Keep the
-- earliest row (or the equipped one) and delete the rest, then block it.
-- Cycle wins legitimately repeat (one per cycle and lift; cycle_id can be NULL after a
-- cycle is deleted), and staff can give a custom badge again, so only non-cycle catalog
-- badges and milestones are unique.

DELETE FROM member_badges mb
USING (
  SELECT id, row_number() OVER (
           PARTITION BY member_id, badge_catalog_id
           ORDER BY is_equipped DESC, awarded_at ASC, id ASC) AS rn
  FROM member_badges
  WHERE badge_catalog_id IS NOT NULL AND source <> 'AUTO_CYCLE'
) d
WHERE mb.id = d.id AND d.rn > 1;

DELETE FROM member_badges mb
USING (
  SELECT id, row_number() OVER (
           PARTITION BY member_id, milestone_badge_id
           ORDER BY is_equipped DESC, awarded_at ASC, id ASC) AS rn
  FROM member_badges
  WHERE milestone_badge_id IS NOT NULL
) d
WHERE mb.id = d.id AND d.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_member_badges_catalog
  ON member_badges (member_id, badge_catalog_id)
  WHERE badge_catalog_id IS NOT NULL AND source <> 'AUTO_CYCLE';

CREATE UNIQUE INDEX IF NOT EXISTS uq_member_badges_milestone
  ON member_badges (member_id, milestone_badge_id)
  WHERE milestone_badge_id IS NOT NULL;

-- 4. "New badge" celebration ------------------------------------------------------------

ALTER TABLE member_badges ADD COLUMN IF NOT EXISTS seen_at TIMESTAMPTZ;
-- Badges earned before this release are not "new".
UPDATE member_badges SET seen_at = awarded_at WHERE seen_at IS NULL;

-- 5. Loyalty badges ---------------------------------------------------------------------
-- MEMBERSHIP_MONTHS counts months with an active membership, not months since joining.

INSERT INTO badge_catalog (key, name, description, icon, color, criteria_type, criteria_value, is_auto_awarded, category) VALUES
  ('MEMBER_1M',  'First Month',   'Active member for 1 month',   'heart',            '#2563EB', 'MEMBERSHIP_MONTHS', 1,  TRUE, 'LOYALTY'),
  ('MEMBER_3M',  'Regular',       'Active member for 3 months',  'heart',            '#2563EB', 'MEMBERSHIP_MONTHS', 3,  TRUE, 'LOYALTY'),
  ('MEMBER_6M',  'Half-Year',     'Active member for 6 months',  'ribbon',           '#2563EB', 'MEMBERSHIP_MONTHS', 6,  TRUE, 'LOYALTY'),
  ('MEMBER_12M', '1 Year Strong', 'Active member for 12 months', 'shield-checkmark', '#B45309', 'MEMBERSHIP_MONTHS', 12, TRUE, 'LOYALTY'),
  ('MEMBER_24M', 'Two-Year Club', 'Active member for 24 months', 'diamond',          '#7C3AED', 'MEMBERSHIP_MONTHS', 24, TRUE, 'LOYALTY')
ON CONFLICT (key) DO NOTHING;
