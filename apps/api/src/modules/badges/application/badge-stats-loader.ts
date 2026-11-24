import {
  activeMembershipDays,
  computeCheckinStreak,
  computeWeeklyConsistent,
  countCheckinsByHour,
  daysToMonths,
  type BadgeStats,
} from '../domain/badge-stats';
import type { BadgesRepository } from '../infrastructure/persistence/badges.repository';

/** Loads a member's activity and turns it into the numbers badges are judged on. */
export async function loadBadgeStats(
  repo: BadgesRepository,
  memberId: string,
  gymId: string,
  now: Date,
): Promise<BadgeStats> {
  const [timeZone, sessionCount, workoutTypeCount, checkins, sessions, history, joinPosition] = await Promise.all([
    repo.getGymTimezone(gymId),
    repo.getSessionCount(memberId),
    repo.getDistinctWorkoutTypeCount(memberId),
    repo.getCheckinTimestamps(memberId),
    repo.getSessionDates(memberId),
    repo.getMembershipHistory(memberId),
    repo.getMemberJoinPosition(gymId, memberId),
  ]);
  const { earlyBird, nightOwl } = countCheckinsByHour(checkins, timeZone);
  return {
    sessionCount,
    workoutTypeCount,
    checkinStreak: computeCheckinStreak(checkins, timeZone, now),
    earlyBirdCount: earlyBird,
    nightOwlCount: nightOwl,
    weeklyConsistent: computeWeeklyConsistent(sessions, timeZone),
    activeMonths: history ? daysToMonths(activeMembershipDays(history, now)) : 0,
    joinPosition,
  };
}
