import { Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../common/errors';
import { localDate } from '../../../../common/time/local-date';
import { FitnessPlanRepository } from '../../infrastructure/persistence/fitness-plan.repository';

interface Macros {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface DailyNutrition {
  /** YYYY-MM-DD in the gym's timezone. */
  date: string;
  entries: number;
  eaten: Macros;
  /** Null when the member has no saved plan yet. */
  targets: (Macros & { waterMl: number }) | null;
  /** Targets minus eaten; negative means over target. Null without a plan. */
  remaining: Macros | null;
}

/** What a member has eaten on one day, against the targets of the plan active that day. */
@Injectable()
export class GetDailyNutritionUseCase {
  constructor(private readonly repo: FitnessPlanRepository) {}

  async execute(gymId: string, memberId: string, date?: string): Promise<DailyNutrition> {
    const member = await this.repo.findMember(memberId, gymId);
    if (!member) throw new NotFoundError('Member not found', 'MEMBER_NOT_FOUND');

    const day = date ?? localDate(new Date(), member.timezone);
    const range = await this.repo.dayBounds(day, member.timezone);
    // Compare against the plan that was active on that day, not today's plan.
    const [totals, plan] = await Promise.all([
      this.repo.sumFoodLogs(memberId, range),
      this.repo.findPlanActiveAt(memberId, range.end),
    ]);

    const eaten = { kcal: totals.kcal, proteinG: totals.proteinG, carbsG: totals.carbsG, fatG: totals.fatG };
    const targets = plan
      ? { kcal: plan.targetKcal, proteinG: plan.proteinG, carbsG: plan.carbsG, fatG: plan.fatG, waterMl: plan.waterMl }
      : null;

    return {
      date: day,
      entries: totals.entries,
      eaten,
      targets,
      remaining: targets
        ? {
            kcal: targets.kcal - eaten.kcal,
            proteinG: targets.proteinG - eaten.proteinG,
            carbsG: targets.carbsG - eaten.carbsG,
            fatG: targets.fatG - eaten.fatG,
          }
        : null,
    };
  }
}
