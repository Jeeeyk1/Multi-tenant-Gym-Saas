-- Seed : 001_roles
-- Description: System roles — seeded once, never modified
-- Idempotent: uses INSERT ... ON CONFLICT DO NOTHING

INSERT INTO roles (name, description, is_system_role) VALUES
  ('MANAGER',    'Full gym control, reports, staff management',        true),
  ('FRONT_DESK', 'Check-ins, member registration, renewals',           true),
  ('TRAINER',    'Members, check-ins, basic reports',                  true)
ON CONFLICT (name) DO NOTHING;
