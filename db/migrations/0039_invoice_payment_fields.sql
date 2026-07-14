-- Migration : 0039_invoice_payment_fields
-- Description: Fields for the manual (reference-number) payment flow — the owner submits a
--              payment reference against an OPEN invoice, an admin verifies or rejects it.
-- Idempotent : ADD COLUMN IF NOT EXISTS.

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS payment_reference    TEXT,
  ADD COLUMN IF NOT EXISTS payment_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by          UUID,
  ADD COLUMN IF NOT EXISTS rejection_reason     TEXT;

-- Admin "pending payments" queue reads invoices awaiting verification.
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices (status);
