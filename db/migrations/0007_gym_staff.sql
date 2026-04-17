-- Migration : 0007_gym_staff
-- Description: Staff & RBAC domain — gym_staff, gym_staff_roles
-- Applied by : db/scripts/apply-migrations.ts

-- ─────────────────────────────────────────────────────────────────────────────
-- gym_staff
-- Records that a user works at a gym.
-- Contains no role info — just the employment relationship.
-- Roles are assigned via gym_staff_roles.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE gym_staff (
  id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id    UUID        NOT NULL REFERENCES gyms (id) ON DELETE CASCADE,
  user_id   UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  is_active BOOLEAN     NOT NULL DEFAULT true,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT gym_staff_gym_user_unique UNIQUE (gym_id, user_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- gym_staff_roles
-- Assigns roles to a staff member within a gym.
-- One staff member can hold multiple roles simultaneously.
-- Effective permissions = union of all assigned roles' permissions.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE gym_staff_roles (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_staff_id UUID        NOT NULL REFERENCES gym_staff (id) ON DELETE CASCADE,
  role_id      UUID        NOT NULL REFERENCES roles (id) ON DELETE RESTRICT,
  assigned_by  UUID        REFERENCES users (id) ON DELETE SET NULL,
  assigned_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT gym_staff_roles_unique UNIQUE (gym_staff_id, role_id)
);
