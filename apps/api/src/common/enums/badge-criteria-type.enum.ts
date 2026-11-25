export enum BadgeCriteriaType {
  SESSION_COUNT       = 'SESSION_COUNT',
  CHECKIN_STREAK      = 'CHECKIN_STREAK',
  WORKOUT_VARIETY     = 'WORKOUT_VARIETY',
  EARLY_BIRD          = 'EARLY_BIRD',
  NIGHT_OWL           = 'NIGHT_OWL',
  WEEKLY_CONSISTENT   = 'WEEKLY_CONSISTENT',
  FOUNDING_MEMBER     = 'FOUNDING_MEMBER',
  /** Months with an active membership (gaps between renewals don't count). */
  MEMBERSHIP_MONTHS   = 'MEMBERSHIP_MONTHS',
  MANUAL              = 'MANUAL',
}
