export enum InvoiceStatus {
  OPEN                  = 'OPEN',
  AWAITING_VERIFICATION = 'AWAITING_VERIFICATION',
  PAID                  = 'PAID',
  REJECTED              = 'REJECTED',
  VOID                  = 'VOID',
}

export enum BillingCycle {
  MONTHLY = 'MONTHLY',
  YEARLY  = 'YEARLY',
}
