// Shared API contracts: request/response types, enums, and constants.
// Import and re-export domain-specific types here as features are built.

export { GymStatus, MemberStatus, StaffRole, MembershipPlanStatus, BadgeCategory, BadgeTier, BadgeRarity } from './enums';

export type ApiResponse<T> = {
  data: T;
  timestamp: string;
};

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
};
