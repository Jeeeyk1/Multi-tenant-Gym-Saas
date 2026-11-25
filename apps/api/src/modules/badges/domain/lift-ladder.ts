import { BadgeRank } from '../../../common/enums';

export const LADDER_TIERS = [BadgeRank.BRONZE, BadgeRank.SILVER, BadgeRank.GOLD] as const;
export type LadderTier = (typeof LADDER_TIERS)[number];
export type LadderWeights = Record<LadderTier, number>;

// Suggested starting weights (kg, actual weight on an approved lift) for the global
// exercises. Gyms can change them per lift.
const BY_EXERCISE: Record<string, [number, number, number]> = {
  'Back Squat': [60, 80, 100],
  'Front Squat': [50, 70, 90],
  'Bench Press': [40, 60, 80],
  'Incline Bench Press': [35, 50, 70],
  'Dumbbell Bench Press': [30, 40, 50],
  'Conventional Deadlift': [80, 110, 140],
  'Sumo Deadlift': [80, 110, 140],
  'Romanian Deadlift': [60, 80, 100],
  'Overhead Press': [30, 40, 55],
  'Seated Dumbbell Press': [20, 30, 40],
  'Barbell Row': [40, 60, 80],
  'Weighted Pull-up': [10, 20, 30],
  'Lat Pulldown': [40, 55, 70],
  'Leg Press': [100, 150, 200],
  'Leg Curl': [30, 45, 60],
  'Leg Extension': [40, 60, 80],
  'Barbell Curl': [20, 30, 40],
  'Tricep Pushdown': [20, 30, 40],
};

// For gym-specific exercises without their own defaults.
const BY_CATEGORY: Record<string, [number, number, number]> = {
  LEGS: [60, 90, 120],
  CHEST: [40, 60, 80],
  BACK: [40, 60, 80],
  SHOULDERS: [25, 35, 50],
  ARMS: [15, 25, 35],
};
const FALLBACK: [number, number, number] = [20, 40, 60];

export function defaultLadder(exercise: { name: string; category: string }): LadderWeights {
  const [bronze, silver, gold] = BY_EXERCISE[exercise.name] ?? BY_CATEGORY[exercise.category] ?? FALLBACK;
  return { BRONZE: bronze, SILVER: silver, GOLD: gold };
}

export function isValidLadder(w: LadderWeights): boolean {
  return w.BRONZE > 0 && w.BRONZE < w.SILVER && w.SILVER < w.GOLD;
}

const TIER_LABEL: Record<LadderTier, string> = { BRONZE: 'Bronze', SILVER: 'Silver', GOLD: 'Gold' };

export function ladderBadgeName(exerciseName: string, tier: LadderTier): string {
  return `${exerciseName} · ${TIER_LABEL[tier]}`;
}

export function ladderBadgeDescription(exerciseName: string, weightKg: number): string {
  return `Lift ${weightKg} kg or more on ${exerciseName} in a lift approved by your gym.`;
}
