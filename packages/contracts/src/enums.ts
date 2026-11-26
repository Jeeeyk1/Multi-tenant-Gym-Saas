export enum GymStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING = 'PENDING',
}

export enum MemberStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  EXPIRED = 'EXPIRED',
  SUSPENDED = 'SUSPENDED',
  /** The member deleted their account; kept, anonymised, for the gym's records. */
  DELETED = 'DELETED',
}

export enum StaffRole {
  OWNER = 'OWNER',
  STAFF = 'STAFF',
  TRAINER = 'TRAINER',
}

export enum MembershipPlanStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum BadgeCategory {
  CONSISTENCY = 'CONSISTENCY',
  LOYALTY = 'LOYALTY',
  STRENGTH = 'STRENGTH',
}

export enum BadgeTier {
  GOLD = 'GOLD',
  SILVER = 'SILVER',
  BRONZE = 'BRONZE',
}

export enum BadgeRarity {
  EPIC = 'EPIC',
  LEGENDARY = 'LEGENDARY',
}
