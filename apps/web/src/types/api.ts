// Shapes returned by the API — kept in sync with the backend response selects

export interface StaffCheckIn {
  id: string;
  checkedInAt: string;
  isOutOfHours: boolean;
  method: 'APP_SELF_CHECKIN' | 'MANUAL_STAFF' | 'QR_STAFF_SCAN' | 'QR_SELF_SCAN';
  member: {
    id: string;
    membershipNumber: string;
    privacy: { hideCheckinVisibility: boolean };
    user: { id: string; fullName: string };
  };
}

export interface MemberListItem {
  id: string;
  membershipNumber: string;
  status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED';
  expiryDate: string;
  joinedAt: string;
  user: { id: string; email: string; fullName: string; phone: string | null };
  membershipPlan: { id: string; name: string; type: string } | null;
}

export interface MembersPage {
  data: MemberListItem[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface MemberDetail {
  id: string;
  gymId: string;
  membershipNumber: string;
  status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED';
  qrCodeToken: string;
  expiryDate: string;
  joinedAt: string;
  updatedAt: string;
  user: { id: string; email: string; fullName: string; phone: string | null };
  membershipPlan: {
    id: string;
    name: string;
    type: string;
    price: number;
    durationDays: number;
  } | null;
}

export interface RenewalRecord {
  id: string;
  previousExpiry: string;
  newExpiry: string;
  amountPaid: number;
  paymentMethod: string | null;
  notes: string | null;
  renewedAt: string;
  renewedByUser: { id: string; fullName: string };
}

export interface StaffAnnouncement {
  id: string;
  gymId: string;
  title: string;
  content: string;
  status: 'PUBLISHED' | 'SCHEDULED' | 'EXPIRED' | 'ARCHIVED' | 'DRAFT';
  targetAudience: string | null;
  isPinned: boolean;
  publishAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdByUser: { id: string; fullName: string };
}
