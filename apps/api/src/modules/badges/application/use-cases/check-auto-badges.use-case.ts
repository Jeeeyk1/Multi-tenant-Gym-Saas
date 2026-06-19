import { Injectable, Logger } from '@nestjs/common';
import { BadgesRepository } from '../../infrastructure/persistence/badges.repository';
import { BadgeCriteriaType } from '../../../../common/enums';

@Injectable()
export class CheckAutoBadgesUseCase {
  private readonly logger = new Logger(CheckAutoBadgesUseCase.name);

  constructor(private readonly repo: BadgesRepository) {}

  async execute(memberId: string, gymId: string): Promise<void> {
    try {
      const [enabledBadges, sessionCount, workoutTypeCount, checkinDates, sessionDates] =
        await Promise.all([
          this.repo.getEnabledBadgeCatalog(gymId),
          this.repo.getSessionCount(memberId),
          this.repo.getDistinctWorkoutTypeCount(memberId),
          this.repo.getCheckinTimestamps(memberId),
          this.repo.getSessionDates(memberId),
        ]);

      const streak = computeCheckinStreak(checkinDates);
      const earlyBirdCount = checkinDates.filter((d) => d.getUTCHours() < 7).length;
      const nightOwlCount = checkinDates.filter((d) => d.getUTCHours() >= 20).length;
      const weeklyConsecutive = computeWeeklyConsistent(sessionDates);

      for (const badge of enabledBadges) {
        const criteria = badge.criteriaType as BadgeCriteriaType;
        const threshold = badge.criteriaValue ?? 0;

        let earned = false;
        switch (criteria) {
          case BadgeCriteriaType.SESSION_COUNT:
            earned = sessionCount >= threshold;
            break;
          case BadgeCriteriaType.CHECKIN_STREAK:
            earned = streak >= threshold;
            break;
          case BadgeCriteriaType.WORKOUT_VARIETY:
            earned = workoutTypeCount >= threshold;
            break;
          case BadgeCriteriaType.EARLY_BIRD:
            earned = earlyBirdCount >= threshold;
            break;
          case BadgeCriteriaType.NIGHT_OWL:
            earned = nightOwlCount >= threshold;
            break;
          case BadgeCriteriaType.WEEKLY_CONSISTENT:
            earned = weeklyConsecutive >= threshold;
            break;
          case BadgeCriteriaType.FOUNDING_MEMBER: {
            const pos = await this.repo.getMemberJoinPosition(gymId, memberId);
            earned = pos <= threshold;
            break;
          }
          default:
            continue;
        }

        if (earned) {
          const already = await this.repo.hasCatalogBadge(memberId, badge.id);
          if (!already) {
            await this.repo.awardCatalogBadge(memberId, gymId, badge.id);
          }
        }
      }
    } catch (err) {
      this.logger.error(
        `checkAutoBadges failed for member ${memberId}`,
        err instanceof Error ? err.message : String(err),
      );
    }
  }
}

function computeCheckinStreak(timestamps: Date[]): number {
  if (timestamps.length === 0) return 0;

  const dates = [
    ...new Set(timestamps.map((d) => d.toISOString().slice(0, 10))),
  ].sort().reverse();

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

  if (dates[0] !== today && dates[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]).getTime();
    const curr = new Date(dates[i]).getTime();
    if ((prev - curr) / 86_400_000 === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function computeWeeklyConsistent(sessionDates: Date[]): number {
  if (sessionDates.length === 0) return 0;

  const weeks = [...new Set(sessionDates.map(toISOWeek))].sort().reverse();

  let consecutive = 1;
  for (let i = 1; i < weeks.length; i++) {
    const prev = parseISOWeek(weeks[i - 1]).getTime();
    const curr = parseISOWeek(weeks[i]).getTime();
    const diff = Math.round((prev - curr) / (7 * 86_400_000));
    if (diff === 1) {
      consecutive++;
    } else {
      break;
    }
  }
  return consecutive;
}

function toISOWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function parseISOWeek(w: string): Date {
  const [year, week] = w.split('-W').map(Number);
  const d = new Date(Date.UTC(year, 0, 1));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + (week - 1) * 7 - day + 1);
  return d;
}
