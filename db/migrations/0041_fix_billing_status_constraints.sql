-- Migration : 0041_fix_billing_status_constraints
-- Description: 0008_plans_subscriptions's CHECK constraints predate the billing Phase 1 status
--              enums and never got updated — subscriptions.status was missing PENDING_PAYMENT
--              and SUSPENDED, invoices.status was missing AWAITING_VERIFICATION and REJECTED.
--              Caught by a live smoke test: gym provisioning 500'd trying to insert
--              Subscription(PENDING_PAYMENT).
-- Idempotent : DROP CONSTRAINT IF EXISTS + re-add.

ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('PENDING_PAYMENT', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED'));

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_status_check
  CHECK (status IN ('DRAFT', 'OPEN', 'AWAITING_VERIFICATION', 'PAID', 'REJECTED', 'VOID'));
