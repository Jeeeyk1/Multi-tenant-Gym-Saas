# Community Chat Domain

## Purpose

The Community Chat domain enables real-time messaging within a gym's community.

Each gym has one default community conversation. All active members and staff are conversation members.

---

## Transport layers

The chat system has two layers that work together:

| Layer | Used for |
|-------|----------|
| REST API | Loading message history (paginated) |
| WebSocket (`/chat` namespace) | Real-time message delivery and events |

Frontend clients should use both. See `docs/04-api/api-reference.md` for the full protocol.

---

## Core entities

### Conversation

Container for all messages.

Key fields:
- `id`
- `gym_id`
- `type` — `COMMUNITY` (MVP) | `DIRECT` | `GROUP` (future)
- `name`
- `is_default` — true for the auto-created community conversation
- `is_announcement_only` — if true, only staff can post

MVP uses `type = COMMUNITY` only.

---

### ConversationMember

Tracks who is in each conversation.

Key fields:
- `conversation_id`
- `user_id`
- `role` — `MEMBER` | `MODERATOR`
- `last_read_at` — used to compute unread count efficiently for large channels
- `is_muted`

Members are auto-enrolled in the community conversation at registration time.

---

### Message

A single message in a conversation.

Key fields:
- `id`
- `conversation_id`
- `sender_id`
- `reply_to_id` — null for top-level, non-null for thread replies
- `type` — `TEXT` | `IMAGE` | `FILE` | `SYSTEM`
- `content` — null for deleted messages
- `metadata` — JSON (image/file metadata, system event data)
- `is_deleted` — soft delete only
- `is_pinned`
- `sent_at`
- `edited_at`

MVP supports `TEXT` type only.

---

### MessageReaction

One row per user per message per emoji.

Key fields:
- `message_id`
- `user_id`
- `emoji`
- `reacted_at`

Unique constraint on `(message_id, user_id, emoji)`. Toggle semantics — inserting a duplicate removes the existing row.

---

### MessageRead

Per-message read receipts. Used for "seen by" indicators in small group and direct chats.

> **Note:** Not used for the community channel MVP. Community chat uses `conversation_members.last_read_at` instead (more efficient for large channels).

---

## Access rules

| Rule | Detail |
|------|--------|
| Conversation membership required | Users must be in `conversation_members` to read or send |
| Active membership to send | Members with `EXPIRED` or `SUSPENDED` gym membership cannot send messages |
| Staff bypass | Staff (no `gym_members` record) can always send |
| Soft delete only | Messages are never hard-deleted — content is wiped, `is_deleted = true` |
| Delete permission | Sender can delete own message; staff with `chat.manage` can delete any |

---

## Message lifecycle

```
sent → [displayed]
     → [reacted to]
     → [soft deleted] → content wiped, is_deleted = true
                      → render as "This message was deleted"
```

---

## Real-time event flow

```
1. Client connects to WebSocket /chat namespace with JWT
2. Server validates token on handshake — invalid tokens are rejected immediately
3. Client emits 'join' for each conversation it needs live events from
4. Server validates conversation membership before allowing join
5. Client sends messages via 'message.send'
6. Server persists message, then broadcasts 'message.new' to all room members
7. All room members (including sender) receive 'message.new'
8. Delete and reaction events follow the same broadcast pattern
```

---

## Room naming

Rooms are named `conversation:{conversationId}`.

This naming works for all current and future conversation types:
- `conversation:abc` — community channel
- `conversation:xyz` — future direct message between two users
- `conversation:def` — future group chat

Adding new conversation types requires no changes to the gateway.

---

## Unread count

The unread count for community channels is computed client-side:

```
unreadCount = messages where sentAt > conversation_members.last_read_at
```

The client updates `last_read_at` by emitting `conversation.read` when the user opens the conversation.

---

## Scalability notes

### Horizontal scaling

The WebSocket gateway uses a Redis pub/sub adapter. When the API runs on multiple instances, events emitted on any instance are relayed through Redis to clients on all other instances. This requires no code changes — the adapter handles it transparently.

### Future direct messages

To add private messaging:
1. Create a `DIRECT` type conversation with two `conversation_members` rows
2. Client joins the conversation room as usual
3. No gateway changes required

### Future group chat

Same as direct messages, with `GROUP` type and more members.

### Future push notifications

Add a `user:{userId}` room in the gateway for server-initiated events that don't belong to a conversation (e.g. membership expiry alerts, renewal reminders).

---

## Integration with other domains

| Domain | Relationship |
|--------|-------------|
| Members | Auto-enrolled in community conversation on registration |
| Identity | JWT validated on WebSocket handshake |
| Gym | Each gym has one default community conversation |
| Announcements | Separate domain — not delivered through chat |

---

## Error codes (chat-specific)

| Code | HTTP | When |
|------|------|------|
| `CONVERSATION_NOT_FOUND` | 404 | Conversation does not exist in this gym |
| `NOT_CONVERSATION_MEMBER` | 403 | Caller is not in `conversation_members` |
| `MEMBERSHIP_NOT_ACTIVE` | 403 | Member's gym membership is EXPIRED or SUSPENDED |
| `MESSAGE_NOT_FOUND` | 404 | Message does not exist or is already deleted |
| `MESSAGE_CANNOT_DELETE` | 403 | Not the sender and no `chat.manage` permission |

---

## MVP scope

Included:
- Community channel (one per gym)
- TEXT messages
- Emoji reactions (toggle)
- Soft delete
- Unread tracking via `last_read_at`
- Real-time via WebSocket with Redis scaling

Not in MVP:
- Image and file messages
- Direct messaging
- Group chat
- Message editing
- Per-message read receipts (schema exists, not used)
- Push notifications
- Moderation tools beyond soft delete
