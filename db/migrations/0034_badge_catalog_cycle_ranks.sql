-- Predefined catalog entries for leaderboard cycle top-3 awards.
-- is_auto_awarded = FALSE: these are NOT triggered by the generic session check.
-- They are awarded exclusively by the CloseCycleUseCase.
INSERT INTO badge_catalog (key, name, description, icon, color, criteria_type, is_auto_awarded) VALUES
  ('CYCLE_GOLD',   'Cycle Champion - Gold',   'Finished #1 in a bi-weekly exercise leaderboard', 'trophy', '#F59E0B', 'MANUAL', FALSE),
  ('CYCLE_SILVER', 'Cycle Champion - Silver', 'Finished #2 in a bi-weekly exercise leaderboard', 'medal',  '#9CA3AF', 'MANUAL', FALSE),
  ('CYCLE_BRONZE', 'Cycle Champion - Bronze', 'Finished #3 in a bi-weekly exercise leaderboard', 'medal',  '#B45309', 'MANUAL', FALSE);
