-- Migration : 0002_users
-- Description: Identity domain — users, user_tokens, refresh_tokens
-- Applied by : db/scripts/apply-migrations.ts

-- ─────────────────────────────────────────────────────────────────────────────
-- users
-- Single source of truth for every person on the platform.
-- Gym owners, staff, and members all share this table.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE users (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email             VARCHAR(255) NOT NULL,
  password_hash     VARCHAR(255),
  -- nullable: account exists before activation (invitation flow)
  full_name         VARCHAR(255) NOT NULL,
  phone             VARCHAR(50),
  system_role       VARCHAR(50)  NOT NULL DEFAULT 'USER',
  -- 'SUPER_ADMIN' | 'USER'
  -- SUPER_ADMIN: internal platform admin only
  -- Never store gym or org roles here
  is_active         BOOLEAN      NOT NULL DEFAULT true,
  email_verified_at TIMESTAMPTZ,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT users_email_unique UNIQUE (email),
  CONSTRAINT users_system_role_check CHECK (system_role IN ('SUPER_ADMIN', 'USER'))
);

-- ─────────────────────────────────────────────────────────────────────────────
-- user_tokens
-- Short-lived single-use tokens for email verification, password reset,
-- and staff/member invitations.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE user_tokens (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token      VARCHAR(255) NOT NULL,
  -- raw hex string: crypto.randomBytes(32).toString('hex')
  -- single-use and short-lived, safe to store raw
  type       VARCHAR(50)  NOT NULL,
  -- 'EMAIL_VERIFICATION' | 'PASSWORD_RESET' | 'INVITE'
  is_used    BOOLEAN      NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ  NOT NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT user_tokens_token_unique UNIQUE (token),
  CONSTRAINT user_tokens_type_check CHECK (type IN ('EMAIL_VERIFICATION', 'PASSWORD_RESET', 'INVITE'))
);

-- ─────────────────────────────────────────────────────────────────────────────
-- refresh_tokens
-- Hashed refresh tokens for persistent login sessions.
-- Raw token is never stored — only SHA-256 hash.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE refresh_tokens (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash  VARCHAR(255) NOT NULL,
  -- SHA-256 hash of the raw token sent to client
  device_info JSONB,
  -- { "browser": "Chrome", "os": "Android", "ip": "1.2.3.4" }
  is_revoked  BOOLEAN      NOT NULL DEFAULT false,
  expires_at  TIMESTAMPTZ  NOT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT refresh_tokens_hash_unique UNIQUE (token_hash)
);
