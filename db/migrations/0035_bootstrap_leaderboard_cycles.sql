-- Create an initial ACTIVE cycle for every gym that has at least one active
-- leaderboard exercise but no existing ACTIVE cycle.
-- This is a one-time bootstrap for gyms that were set up before the cycle
-- system was introduced.

INSERT INTO leaderboard_cycles (id, gym_id, status, started_at, created_at)
SELECT
  gen_random_uuid(),
  lc.gym_id,
  'ACTIVE',
  NOW(),
  NOW()
FROM gym_leaderboard_exercises lc
WHERE lc.is_active = TRUE
  AND NOT EXISTS (
    SELECT 1
    FROM leaderboard_cycles lcy
    WHERE lcy.gym_id = lc.gym_id
      AND lcy.status = 'ACTIVE'
  )
GROUP BY lc.gym_id;
