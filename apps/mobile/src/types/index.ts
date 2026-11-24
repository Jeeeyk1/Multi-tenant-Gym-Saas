import type { BadgeCategory, BadgeTier } from '../constants/enums';
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
  description?: string | null;
  isActive?: boolean;
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
  privacy?: MemberPrivacy | null;
}

export interface MemberPrivacy {
  hideCheckinVisibility: boolean;
  hideFromMemberList: boolean;
}

export interface PublicActiveCheckin {
  memberId: string;
  userId: string;
  fullName: string;
  checkedInAt: string;
}

export interface PublicActiveCheckinsResult {
  totalCount: number;
  visible: PublicActiveCheckin[];
}

export interface MembershipRenewal {
  id: string;
  previousExpiry: string;
  newExpiry: string;
  amountPaid: number;
  paymentMethod: string | null;
  notes: string | null;
  renewedAt: string;
  renewedByUser: {
    id: string;
    fullName: string;
  };
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
  /** Calorie formula only. MALE | FEMALE | UNSPECIFIED */
  sex?: string | null;
  /** Display preference; values are always stored in kg / cm. METRIC | IMPERIAL */
  unitSystem?: string;
  healthCaution?: boolean;
  healthDataConsentAt?: string | null;
  onboardingDone: boolean;
}

/** Body for PATCH me/profile. `healthDataConsent` is write-only. */
export type MemberProfileUpdate = Partial<
  Omit<MemberProfile, 'id' | 'memberId' | 'healthDataConsentAt'>
> & { healthDataConsent?: boolean };

// Fitness plan — GET/POST /gyms/:gymId/members/:memberId/fitness-plan…

export interface DailyTargets {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  waterMl: number;
}

export interface PaceOption {
  pace: string;
  available: boolean;
  unavailableReason: string | null;
  /** Negative while losing, positive while gaining. */
  weeklyRateKg: number;
  targets: DailyTargets;
  weeksToGoal: number | null;
  /** YYYY-MM-DD */
  targetDate: string | null;
}

export interface FitnessPlanOptions {
  calculatorVersion: number;
  direction: string;
  bmrKcal: number;
  tdeeKcal: number;
  maintenance: DailyTargets;
  /** STEADY, BALANCED, FAST — empty when direction is MAINTAIN. */
  options: PaceOption[];
  recommendedPace: string | null;
  adviseProfessional: boolean;
}

export interface FitnessPlan {
  id: string;
  calculatorVersion: number;
  direction: string;
  goalPace: string | null;
  fitnessGoal: string;
  weightKg: number;
  targetWeightKg: number | null;
  bmrKcal: number;
  tdeeKcal: number;
  targetKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  waterMl: number;
  weeklyRateKg: number;
  targetDate: string | null;
  createdAt: string;
}

export interface Macros {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface DailyNutrition {
  date: string;
  entries: number;
  eaten: Macros;
  targets: (Macros & { waterMl: number }) | null;
  remaining: Macros | null;
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

export interface GymRenewal extends RenewalRecord {
  member: {
    id: string;
    membershipNumber: string;
    user: { id: string; fullName: string };
    membershipPlan: { id: string; name: string; type: string } | null;
  };
}

// AI features
export interface WorkoutExercise {
  name: string;
  sets: number | null;
  reps: string | null;
  restSec: number | null;
  tip: string | null;
}

export interface WorkoutSection {
  title: string;
  exercises: WorkoutExercise[];
}

export interface WorkoutDay {
  day: string;
  focus: string;
  totalDurationMin: number;
  sections: WorkoutSection[];
}

export interface WorkoutWeekPlan {
  weekPlan: WorkoutDay[];
}

export interface ExerciseInstructions {
  targetMuscles: string[];
  steps: string[];
  commonMistakes: string[];
  easier: string;
  harder: string;
}

export interface WorkoutSuggestion {
  suggestion: string;
}

export type WorkoutFocus = 'AUTO' | 'FULL_BODY' | 'UPPER_BODY' | 'LOWER_BODY' | 'CORE';
export type WorkoutEmphasis = 'BALANCED' | 'BUILD_MUSCLE' | 'BURN_FAT' | 'STRENGTH' | 'ENDURANCE';

export interface WorkoutPlanRequest {
  focus?: WorkoutFocus;
  emphasis?: WorkoutEmphasis;
  daysPerWeek?: number;
  sessionMinutes?: number;
}

export interface MealSuggestion {
  suggestion: string;
}

export type MealPlanMode = 'FULL_DAY' | 'SINGLE_MEAL';

export interface MealPlanRequest {
  mode: MealPlanMode;
  targetCalories?: number;
  mealCount?: number;
  targetProteinG?: number;
}

export interface PlannedMeal {
  name: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  items: string[];
}

export interface MealPlan {
  mode: MealPlanMode;
  title: string;
  targetCalories: number;
  totalCalories: number;
  totalProteinG: number;
  meals: PlannedMeal[];
  tips: string[];
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

export interface CheckinsTrendPoint {
  date: string;
  count: number;
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
  member: { user: { id: string; fullName: string } };
}

export interface LeaderboardExerciseResult {
  exercise: { id: string; name: string; category: string };
  displayOrder: number;
  entries: LeaderboardEntry[];
}

// Workout sessions
export type WorkoutType = 'Strength' | 'Cardio' | 'HIIT' | 'CrossFit' | 'Yoga' | 'Other';

export interface WorkoutSession {
  id: string;
  workoutType: WorkoutType | string;
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
  caloriesBurned: number | null;
  avgHeartRate: number | null;
  source: 'manual' | 'healthkit';
  createdAt: string;
}

export interface WorkoutSessionsPage {
  data: WorkoutSession[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

// Badges
export interface CustomBadge {
  id: string;
  category: BadgeCategory;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  isActive: boolean;
}

// A member equips one badge per category.
export type { BadgeCategory, BadgeTier } from '../constants/enums';

export interface MemberBadge {
  id: string;
  category: BadgeCategory;
  source: 'AUTO_SYSTEM' | 'AUTO_CYCLE' | 'AUTO_MILESTONE' | 'STAFF_AWARD';
  badgeRank: BadgeTier | null;
  proofNotes: string | null;
  awardedAt: string;
  expiresAt: string | null;
  seenAt: string | null;
  cycleId: string | null;
  isEquipped: boolean;
  badgeCatalog: { id: string; key: string; name: string; description: string | null; icon: string; color: string } | null;
  customBadge: { id: string; name: string; icon: string; color: string; description: string | null } | null;
  milestoneBadge: {
    id: string;
    badgeName: string;
    description: string | null;
    icon: string;
    color: string;
    tier: BadgeTier | null;
    weightKg: number;
    exercise: { name: string };
  } | null;
}

/** A badge as shown next to a member's name (chat, leaderboard, Who's Here). */
export interface EquippedBadge {
  memberBadgeId: string;
  category: BadgeCategory;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  tier: BadgeTier | null;
  awardedAt: string;
}

export interface EquippedBadgeRow {
  userId: string;
  /** Up to three, in category order. */
  badges: EquippedBadge[];
}

export interface CollectionBadge {
  key: string;
  category: BadgeCategory;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  tier: BadgeTier | null;
  exercise: { id: string; name: string } | null;
  earned: {
    memberBadgeId: string;
    awardedAt: string;
    expiresAt: string | null;
    expired: boolean;
    isEquipped: boolean;
    seenAt: string | null;
  } | null;
  timesEarned: number;
  progress: { current: number; target: number; unit: string } | null;
  rarityPct: number | null;
}

export interface BadgeCollection {
  earnedCount: number;
  totalCount: number;
  categories: { category: BadgeCategory; equipped: CollectionBadge | null; badges: CollectionBadge[] }[];
}

// API errors
export interface ApiError {
  statusCode: number;
  error: string;
  code: string;
  message: string;
}

export interface InsightsStep {
  tool: string;
  label: string;
  data: unknown;
}

export interface InsightsResult {
  answer: string;
  toolsUsed: string[];
  steps: InsightsStep[];
}

export interface InsightsHistoryTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface WeightLog {
  id: string;
  /** Decimal from the API — normalise with toNumber(). */
  weightKg: string | number;
  notes: string | null;
  loggedAt: string;
}

export interface WeighInResult {
  weightKg: number;
  loggedAt: string;
  /** At (or within 0.5 kg of) the active plan's goal weight. */
  goalReached: boolean;
  /** The plan was recalculated because weight moved 2 kg or more. */
  planUpdated: boolean;
  plan: FitnessPlan | null;
}

export interface AiFeatureUsage {
  feature: string;
  used: number;
  limit: number;
  remaining: number;
}

export interface AiUsage {
  resetsAt: string;
  features: AiFeatureUsage[];
}
