-- Migration : 0038_perf_indexes
-- Description: Composite indexes for hot analytics/list queries that had no good index
--              (found by an EXPLAIN-style audit of the reports, insights, renewals and
--              member-list queries). `IF NOT EXISTS` keeps it idempotent.
-- Note       : plain CREATE INDEX briefly locks each table. Fine at current data volumes;
--              on a large production table, switch to CREATE INDEX CONCURRENTLY (cannot run
--              inside a transaction).

-- Check-ins trend + metric counts: WHERE gym_id AND checked_in_at BETWEEN ...
-- (the existing idx_check_ins_active is partial — active rows only — so it can't serve this).
CREATE INDEX IF NOT EXISTS idx_check_ins_gym_date
  ON check_ins (gym_id, checked_in_at);

-- Member list ordering (WHERE gym_id ORDER BY joined_at DESC) + new-member trend
-- (WHERE gym_id AND joined_at BETWEEN ...).
CREATE INDEX IF NOT EXISTS idx_gym_members_gym_joined
  ON gym_members (gym_id, joined_at DESC);

-- "How many active/expired/suspended members" — WHERE gym_id AND status = ...
CREATE INDEX IF NOT EXISTS idx_gym_members_gym_status
  ON gym_members (gym_id, status);

-- Renewals had ONLY a pkey, so the FK join for the revenue trend and the member renewals
-- list did a seq scan. Serves: JOIN ON member_id, and member renewals ORDER BY renewed_at DESC.
CREATE INDEX IF NOT EXISTS idx_renewals_member_date
  ON membership_renewals (member_id, renewed_at DESC);
