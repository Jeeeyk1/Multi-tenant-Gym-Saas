import type { Prisma } from '@prisma/client';
import { LADDER_TIERS, defaultLadder, ladderBadgeDescription, ladderBadgeName } from './lift-ladder';

/** The three default rungs for a lift, as rows to insert (system-created, no staff creator). */
export function defaultLadderRows(
  gymId: string,
  exercise: { id: string; name: string; category: string },
): Prisma.ExerciseMilestoneBadgeCreateManyInput[] {
  const weights = defaultLadder(exercise);
  return LADDER_TIERS.map((tier) => ({
    gymId,
    exerciseId: exercise.id,
    tier,
    weightKg: weights[tier],
    badgeName: ladderBadgeName(exercise.name, tier),
    description: ladderBadgeDescription(exercise.name, weights[tier]),
    icon: 'barbell',
    color: '#B45309',
  }));
}
