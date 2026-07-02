// Shapes returned by the API — kept in sync with the backend response selects

export interface MembershipPlan {
  id: string;
  name: string;
  type: string;
  description: string | null;
  price: number;
  durationDays: number;
  isActive: boolean;
}

export interface StaffCheckIn {
  id: string;
  checkedInAt: string;
  checkedOutAt?: string | null;
  isOutOfHours: boolean;
  isAutoCheckout?: boolean;
  method: 'APP_SELF_CHECKIN' | 'MANUAL_STAFF' | 'QR_STAFF_SCAN' | 'QR_SELF_SCAN';
  member: {
    id: string;
    membershipNumber: string;
    privacy?: { hideCheckinVisibility: boolean };
    user: { id: string; fullName: string };
  };
}

export interface CheckInsPage {
  data: StaffCheckIn[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface CheckinsTrendPoint {
  date: string;
  count: number;
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

export interface GymRenewal extends RenewalRecord {
  member: {
    id: string;
    membershipNumber: string;
    user: { id: string; fullName: string };
    membershipPlan: { id: string; name: string; type: string } | null;
  };
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  replyToId: string | null;
  type: string;
  content: string;
  isDeleted: boolean;
  isPinned: boolean;
  sentAt: string;
  editedAt: string | null;
  sender: { id: string; fullName: string };
  reactions: { userId: string; emoji: string; reactedAt: string }[];
  replyTo: {
    id: string;
    senderId: string;
    content: string;
    isDeleted: boolean;
    sender: { id: string; fullName: string };
  } | null;
}

export interface Conversation {
  id: string;
  gymId: string;
  type: string;
  name: string | null;
}

export interface StaffMember {
  id: string;
  isActive: boolean;
  joinedAt: string;
  user: { id: string; email: string; fullName: string; phone: string | null };
  roles: { id: string; assignedAt: string; role: { id: string; name: string } }[];
}

export interface GymRole {
  id: string;
  name: string;
  description: string | null;
}

export interface GymProfile {
  description: string | null;
  logoUrl: string | null;
  coverPhotoUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

export interface GymSchedule {
  dayOfWeek: number;
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
}

export interface GymDetail {
  id: string;
  name: string;
  code: string;
  status: string;
  timezone: string;
  address: string | null;
  city: string | null;
  country: string;
  profile: GymProfile | null;
  schedules: GymSchedule[];
}

// ── Leaderboard ────────────────────────────────────────────────────────────

export interface Exercise {
  id: string;
  name: string;
  category: string;
  gymId: string | null;
}

export interface LeaderboardConfigItem {
  id: string;
  displayOrder: number;
  isActive: boolean;
  exercise: { id: string; name: string; category: string };
}

export interface PrSubmission {
  id: string;
  gymId: string;
  weightKg: number;
  reps: number;
  estimated1rm: number;
  photoUrl: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submissionType: 'SELF' | 'STAFF';
  notes: string | null;
  rejectionReason: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  exercise: { id: string; name: string; category: string };
  member: {
    id: string;
    membershipNumber: string;
    user: { id: string; fullName: string };
  };
  submittedByUser: { id: string; fullName: string };
  reviewedByUser: { id: string; fullName: string } | null;
}

export interface LeaderboardEntry {
  rank: number;
  id: string;
  weightKg: number;
  reps: number;
  estimated1rm: number;
  photoUrl: string;
  submittedAt: string;
  member: { user: { fullName: string } };
}

export interface LeaderboardExerciseResult {
  exercise: { id: string; name: string; category: string };
  displayOrder: number;
  entries: LeaderboardEntry[];
}

// ── Badges ─────────────────────────────────────────────────────────────────

export interface BadgeCatalogEntry {
  id: string;
  key: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  criteriaType: string;
  criteriaValue: number | null;
  isAutoAwarded: boolean;
}

export interface GymCustomBadge {
  id: string;
  gymId: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  isActive: boolean;
  createdAt: string;
}

export interface ExerciseMilestoneBadge {
  id: string;
  gymId: string;
  exerciseId: string;
  badgeName: string;
  description: string | null;
  weightKg: number;
  icon: string;
  color: string;
  isActive: boolean;
  createdAt: string;
  exercise: { id: string; name: string };
}

export interface MemberBadge {
  id: string;
  memberId: string;
  gymId: string;
  source: 'AUTO_SYSTEM' | 'AUTO_CYCLE' | 'AUTO_MILESTONE' | 'STAFF_AWARD';
  badgeRank: 'GOLD' | 'SILVER' | 'BRONZE' | null;
  proofNotes: string | null;
  expiresAt: string | null;
  isEquipped: boolean;
  awardedAt: string;
  badgeCatalog: BadgeCatalogEntry | null;
  customBadge: GymCustomBadge | null;
  milestoneBadge: (ExerciseMilestoneBadge & { exercise: { id: string; name: string } }) | null;
  cycle: { id: string; startedAt: string; endedAt: string | null } | null;
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

export interface InsightsResult {
  answer: string;
  toolsUsed: string[];
}
