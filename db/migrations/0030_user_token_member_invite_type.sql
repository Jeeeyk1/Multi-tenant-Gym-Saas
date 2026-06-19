-- Migration : 0030_user_token_member_invite_type
-- Description: Add MEMBER_INVITE to the user_tokens type check constraint.
--              PostgreSQL does not support ALTER CONSTRAINT, so the old
--              constraint must be dropped and recreated with the expanded list.

ALTER TABLE user_tokens
  DROP CONSTRAINT user_tokens_type_check;

ALTER TABLE user_tokens
  ADD CONSTRAINT user_tokens_type_check
  CHECK (type IN ('EMAIL_VERIFICATION', 'PASSWORD_RESET', 'INVITE', 'MEMBER_INVITE'));
