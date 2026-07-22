export type BulkInviteRowStatus = 'ready' | 'duplicate_in_file' | 'already_registered' | 'invalid';

export interface BulkInviteRowResult {
  rowNumber: number;
  fullName: string;
  email: string;
  expiryDate: string;
  status: BulkInviteRowStatus;
  /** Present for non-ready rows: why it will be skipped. */
  reason?: string;
}

export interface BulkInvitePreview {
  rows: BulkInviteRowResult[];
  summary: {
    total: number;
    ready: number;
    skipped: number; // duplicate_in_file + already_registered
    invalid: number;
  };
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
