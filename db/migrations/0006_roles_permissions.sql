-- Migration : 0006_roles_permissions
-- Description: Staff & RBAC domain — roles, permissions, role_permissions
-- Applied by : db/scripts/apply-migrations.ts

-- ─────────────────────────────────────────────────────────────────────────────
-- roles
-- Seeded system roles. is_system_role = true means undeletable platform roles.
-- Custom gym roles have is_system_role = false.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE roles (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name           VARCHAR(100) NOT NULL,
  description    TEXT,
  is_system_role BOOLEAN      NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT roles_name_unique UNIQUE (name)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- permissions
-- Granular action keys. Seeded once. Grows only when new features are added.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE permissions (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  key         VARCHAR(100) NOT NULL,
  -- e.g. 'members.view' | 'checkins.manage' | 'staff.manage'
  description VARCHAR(255),
  module      VARCHAR(100) NOT NULL,
  -- e.g. 'Members' | 'CheckIns' | 'Staff' | 'Gym'

  CONSTRAINT permissions_key_unique UNIQUE (key)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- role_permissions
-- Maps roles to permissions. Controls what each role can do.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE role_permissions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id       UUID NOT NULL REFERENCES roles (id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions (id) ON DELETE CASCADE,

  CONSTRAINT role_permissions_unique UNIQUE (role_id, permission_id)
);
