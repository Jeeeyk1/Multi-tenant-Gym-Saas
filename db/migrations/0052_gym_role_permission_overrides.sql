-- Migration : 0052_gym_role_permission_overrides
-- Description: Per-gym changes to what a role may do. Gyms are set up differently (a solo owner,
--              staff who coach, a full team), so an owner can switch selected permissions on or
--              off for Staff or Trainer in their gym. The role's own permissions stay the default;
--              a row here overrides one permission for one role in one gym.
--              Which (role, permission) pairs are adjustable is decided in code
--              (common/auth/role-settings.ts). OWNER is never overridden.
-- Applied by : db/scripts/apply-migrations.ts

CREATE TABLE IF NOT EXISTS gym_role_permission_overrides (
  gym_id        UUID        NOT NULL REFERENCES gyms (id) ON DELETE CASCADE,
  role_id       UUID        NOT NULL REFERENCES roles (id) ON DELETE CASCADE,
  permission_id UUID        NOT NULL REFERENCES permissions (id) ON DELETE CASCADE,
  is_granted    BOOLEAN     NOT NULL,
  updated_by    UUID        REFERENCES users (id) ON DELETE SET NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (gym_id, role_id, permission_id)
);
