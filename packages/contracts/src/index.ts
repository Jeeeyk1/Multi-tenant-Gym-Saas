// Shared API contracts: request/response types, enums, and constants.
// Import and re-export domain-specific types here as features are built.

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
