-- Migration : 0012_conversations_messages
-- Description: Chat domain — conversations, conversation_members, messages,
--              message_reads, message_reactions
-- Applied by : db/scripts/apply-migrations.ts

-- ─────────────────────────────────────────────────────────────────────────────
-- conversations
-- Container for all chat. MVP uses only type = 'COMMUNITY'.
-- One default community conversation is auto-created with each gym.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE conversations (
  id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id               UUID         NOT NULL REFERENCES gyms (id) ON DELETE CASCADE,
  type                 VARCHAR(50)  NOT NULL DEFAULT 'COMMUNITY',
  -- MVP: 'COMMUNITY' only
  -- Future: 'DIRECT' | 'GROUP'
  name                 VARCHAR(255),
  description          TEXT,
  is_default           BOOLEAN      NOT NULL DEFAULT false,
  -- true = auto-created with gym, cannot be deleted
  is_announcement_only BOOLEAN      NOT NULL DEFAULT false,
  -- true = only staff can post, members read only
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT conversations_type_check CHECK (type IN ('COMMUNITY', 'DIRECT', 'GROUP'))
);

-- ─────────────────────────────────────────────────────────────────────────────
-- conversation_members
-- Who is in each conversation.
-- last_read_at drives unread count — more efficient than per-message reads
-- for large community channels.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE conversation_members (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
  user_id         UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  role            VARCHAR(50) NOT NULL DEFAULT 'MEMBER',
  -- 'MEMBER' | 'MODERATOR'
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_read_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_muted        BOOLEAN     NOT NULL DEFAULT false,

  CONSTRAINT conversation_members_unique    UNIQUE (conversation_id, user_id),
  CONSTRAINT conversation_members_role_check CHECK (role IN ('MEMBER', 'MODERATOR'))
);

-- ─────────────────────────────────────────────────────────────────────────────
-- messages
-- Every message ever sent. Soft delete only — never hard delete.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE messages (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID         NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
  sender_id       UUID         NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  reply_to_id     UUID         REFERENCES messages (id) ON DELETE SET NULL,
  -- null = top-level message
  -- non-null = reply to another message
  type            VARCHAR(50)  NOT NULL DEFAULT 'TEXT',
  -- 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM'
  -- SYSTEM = auto-generated e.g. "Maria joined the gym"
  content         TEXT,
  -- null for deleted messages (content wiped on soft delete)
  metadata        JSONB        NOT NULL DEFAULT '{}',
  -- IMAGE: { "url": "...", "width": 800, "height": 600 }
  -- FILE:  { "url": "...", "filename": "plan.pdf", "size": 204800 }
  -- SYSTEM:{ "event": "member_joined", "userId": "..." }
  is_deleted      BOOLEAN      NOT NULL DEFAULT false,
  -- Soft delete: render "This message was deleted" in UI
  -- Content should be wiped when is_deleted = true
  is_pinned       BOOLEAN      NOT NULL DEFAULT false,
  sent_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
  edited_at       TIMESTAMPTZ,

  CONSTRAINT messages_type_check CHECK (type IN ('TEXT', 'IMAGE', 'FILE', 'SYSTEM'))
);

-- ─────────────────────────────────────────────────────────────────────────────
-- message_reads
-- Per-message read receipts.
-- Use for "seen by" indicators in small group/direct chats.
-- For large community channels, rely on conversation_members.last_read_at.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE message_reads (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID        NOT NULL REFERENCES messages (id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  read_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT message_reads_unique UNIQUE (message_id, user_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- message_reactions
-- Emoji reactions. One row per user per message per emoji.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE message_reactions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID        NOT NULL REFERENCES messages (id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  emoji      VARCHAR(10) NOT NULL,
  reacted_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT message_reactions_unique UNIQUE (message_id, user_id, emoji)
);
