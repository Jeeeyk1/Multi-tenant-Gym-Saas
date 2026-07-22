import { randomBytes } from 'crypto';
import { BillingCycle } from '../../../common/enums';

/** Days a freshly-issued invoice has before it's considered overdue. */
export const FIRST_INVOICE_DUE_DAYS = 7;

/** How many days before `currentPeriodEnd` the renewal invoice + reminder are generated. */
export const RENEWAL_REMINDER_DAYS = 7;

/** Days a subscription stays PAST_DUE (still usable) before it's SUSPENDED (locked). */
export const GRACE_PERIOD_DAYS = 7;

export function addBillingPeriod(start: Date, cycle: BillingCycle): Date {
  const end = new Date(start);
  if (cycle === BillingCycle.YEARLY) end.setFullYear(end.getFullYear() + 1);
  else end.setMonth(end.getMonth() + 1);
  return end;
}

export function addDays(start: Date, days: number): Date {
  const end = new Date(start);
  end.setDate(end.getDate() + days);
  return end;
}

/** Bounds for an admin-granted trial length, in days. */
export const MIN_TRIAL_DAYS = 1;
export const MAX_TRIAL_DAYS = 365;

export function generateInvoiceNumber(): string {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  return `INV-${stamp}-${randomBytes(4).toString('hex').toUpperCase()}`;
}
