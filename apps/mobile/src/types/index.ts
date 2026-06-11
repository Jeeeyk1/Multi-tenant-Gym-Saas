// Auth
export interface ResolveCodeResponse {
  type: 'GYM' | 'ORG';
  gymId?: string;
  gymName?: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  organizationId?: string;
  organizationName?: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    fullName: string;
  };
}

export interface JwtPayload {
  sub: string;
  email: string;
  gymId: string;
  gymCode: string;
  roles: string[];
  permissions: string[];
  type: 'gym' | 'org';
  exp: number;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  gymId: string;
  gymCode: string;
  roles: string[];
  permissions: string[];
}

// Membership
export interface MembershipPlan {
  id: string;
  name: string;
  type: string;
  price: number;
  durationDays: number;
}

export interface GymMember {
  id: string;
  membershipNumber: string;
  status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED';
  expiryDate: string;
  qrCodeToken: string;
  user: {
    id: string;
    email: string;
    fullName: string;
  };
  plan: MembershipPlan;
  renewals?: MembershipRenewal[];
}

export interface MembershipRenewal {
  id: string;
  planId: string;
  amountPaid: number;
  paymentMethod: string;
  newExpiryDate: string;
  renewedAt: string;
}

// Check-in
export interface CheckIn {
  id: string;
  checkedInAt: string;
  checkedOutAt: string | null;
  method: 'APP_SELF_CHECKIN' | 'MANUAL_STAFF' | 'QR_STAFF_SCAN' | 'QR_SELF_SCAN';
  member?: {
    id: string;
    membershipNumber: string;
    user: { fullName: string };
  };
}

// Announcements
export interface Announcement {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  publishAt: string;
  expiresAt: string | null;
  status: 'PUBLISHED' | 'SCHEDULED' | 'EXPIRED' | 'ARCHIVED';
  createdByUser: {
    id: string;
    fullName: string;
  };
  readAt?: string | null;
}

// Chat
export interface ChatReaction {
  emoji: string;
  userId: string;
}

export interface ChatMessage {
  id: string;
  content: string | null;
  isDeleted: boolean;
  sentAt: string;
  sender: {
    id: string;
    fullName: string;
  };
  reactions: ChatReaction[];
  replyTo: ChatMessage | null;
}

export interface Conversation {
  id: string;
  type: 'COMMUNITY' | 'DIRECT' | 'GROUP';
  name: string | null;
  isDefault: boolean;
}

// Member profile (onboarding data)
export interface MemberProfile {
  id?: string;
  memberId: string;
  age?: number | null;
  weightKg?: number | null;
  targetWeightKg?: number | null;
  heightCm?: number | null;
  fitnessGoal?: string | null;
  activityLevel?: string | null;
  daysPerWeek?: number | null;
  experienceLevel?: string | null;
  preferredStyle?: string | null;
  dietType?: string | null;
  injuries?: string | null;
  onboardingDone: boolean;
}

// Staff — active check-in (member is always present for staff views)
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

// Staff — member list item (shape returned by GET /gyms/:gymId/members)
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

// Staff — announcement (returned by GET /gyms/:gymId/announcements)
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

// Staff — full member detail (returned by GET /gyms/:gymId/members/:memberId)
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

// Staff — renewal audit record (from GET /gyms/:gymId/members/:memberId/renewals)
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

// AI features
export interface WorkoutSuggestion {
  suggestion: string;
}

export interface MealSuggestion {
  suggestion: string;
}

export interface MealAnalysis {
  description: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  notes: string;
}

export interface FoodLog {
  id: string;
  description: string;
  calories: number | null;
  proteinG: string | null;
  carbsG: string | null;
  fatG: string | null;
  loggedAt: string;
}

// Leaderboard
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

// API errors
export interface ApiError {
  statusCode: number;
  error: string;
  code: string;
  message: string;
}
