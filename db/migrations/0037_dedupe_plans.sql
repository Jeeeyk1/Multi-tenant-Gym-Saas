-- Migration : 0037_dedupe_plans
-- Description: Remove duplicate plan rows that accumulated because `plans` had no unique
--              constraint (so 004_plans' `ON CONFLICT DO NOTHING` never fired and every
--              re-seed re-inserted the tiers). Keeps the earliest row per plan name,
--              repoints any subscriptions off the duplicates, then adds a UNIQUE constraint
--              on plans.name so re-seeding is idempotent from now on.
-- Idempotent : dedupe steps are no-ops once clean; the constraint is added only if absent.

-- 1. Repoint subscriptions on a duplicate to the canonical (earliest) plan of the same name.
--    subscriptions.plan_id is ON DELETE RESTRICT, so this must happen before the delete.
UPDATE subscriptions s
SET plan_id = c.keep_id
FROM plans p
JOIN (
  SELECT DISTINCT ON (name) name, id AS keep_id
  FROM plans
  ORDER BY name, created_at, id
) c ON c.name = p.name
WHERE s.plan_id = p.id AND s.plan_id <> c.keep_id;

-- 2. Delete the duplicate plans (their plan_features cascade-delete via FK).
DELETE FROM plans p
USING (
  SELECT DISTINCT ON (name) name, id AS keep_id
  FROM plans
  ORDER BY name, created_at, id
) c
WHERE p.name = c.name AND p.id <> c.keep_id;

-- 3. Enforce uniqueness so 004_plans' ON CONFLICT DO NOTHING prevents future duplicates.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'plans_name_key') THEN
    ALTER TABLE plans ADD CONSTRAINT plans_name_key UNIQUE (name);
  END IF;
END $$;
