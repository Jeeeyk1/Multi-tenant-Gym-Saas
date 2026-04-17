-- Migration : 0003_organizations
-- Description: Organization domain — organizations, organization_members
-- Applied by : db/scripts/apply-migrations.ts

-- ─────────────────────────────────────────────────────────────────────────────
-- organizations
-- The tenant root. Every gym owner registers an organization first.
-- Billing and multi-gym ownership attach here.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE organizations (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(255) NOT NULL,
  slug       VARCHAR(100) NOT NULL,
  -- URL-friendly identifier e.g. 'fitlife-ph'
  -- Lowercase, hyphens only. Used as entry point for org-level login.
  status     VARCHAR(50)  NOT NULL DEFAULT 'ACTIVE',
  -- 'ACTIVE' | 'SUSPENDED' | 'CANCELLED'
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT organizations_slug_unique UNIQUE (slug),
  CONSTRAINT organizations_status_check CHECK (status IN ('ACTIVE', 'SUSPENDED', 'CANCELLED'))
);

-- ─────────────────────────────────────────────────────────────────────────────
-- organization_members
-- Who manages an organization and at what org-level role.
-- Separate from gym staff roles — org roles control billing and org settings.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE organization_members (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  user_id         UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  role            VARCHAR(50)  NOT NULL,
  -- 'OWNER'     : full control, billing access
  -- 'CO_OWNER'  : full control, no billing
  -- 'ORG_ADMIN' : manage gyms, no billing or ownership transfer
  joined_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT org_members_org_user_unique UNIQUE (organization_id, user_id),
  CONSTRAINT org_members_role_check CHECK (role IN ('OWNER', 'CO_OWNER', 'ORG_ADMIN'))
);
