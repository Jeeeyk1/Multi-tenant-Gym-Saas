export enum MemberStatus {
  ACTIVE    = 'ACTIVE',
  EXPIRED   = 'EXPIRED',
  SUSPENDED = 'SUSPENDED',
  /** The member deleted their account. The row is kept, anonymised, for the gym's records. */
  DELETED   = 'DELETED',
}
