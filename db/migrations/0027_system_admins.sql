-- System-level administrators (SaaS platform owners)
-- Completely separate from org/gym users — different auth path, different JWT type.
CREATE TABLE system_admins (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT        NOT NULL,
  password_hash TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_system_admins_email UNIQUE (email)
);
