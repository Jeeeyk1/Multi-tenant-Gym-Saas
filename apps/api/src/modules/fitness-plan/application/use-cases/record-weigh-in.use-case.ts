import { Injectable } from '@nestjs/common';
import { DomainError, NotFoundError } from '../../../../common/errors';
import { FitnessDirection, type GoalPace } from '../../../../common/enums';
import { FitnessPlanRepository } from '../../infrastructure/persistence/fitness-plan.repository';
import { buildFitnessPlanOptions, TARGET_TOLERANCE_KG } from '../../domain/fitness-plan.calculator';
import { loadPlanInput, planDataForPace, toPlanView, type FitnessPlanView } from '../plan-input';

/** A weight change of at least this much since the active plan recalculates it. */
export const RECALCULATE_AFTER_KG = 2;

export interface WeighInResult {
  weightKg: number;
  loggedAt: Date;
  /** The member is at or past the goal weight of their active plan. */
  goalReached: boolean;
  /** A new plan was saved because weight moved by RECALCULATE_AFTER_KG or more. */
  planUpdated: boolean;
  plan: FitnessPlanView | null;
}

/**
 * Records a weigh-in. Calorie needs fall as weight falls (and rise as it rises), so
 * once weight has moved enough the plan is recalculated at the same pace. The goal
 * date then reflects real progress.
 */
@Injectable()
export class RecordWeighInUseCase {
  constructor(private readonly repo: FitnessPlanRepository) {}

  async execute(gymId: string, memberId: string, weightKg: number): Promise<WeighInResult> {
    const member = await this.repo.findMember(memberId, gymId);
    if (!member) throw new NotFoundError('Member not found', 'MEMBER_NOT_FOUND');

    const logged = await this.repo.recordWeighIn(memberId, weightKg);
    const active = await this.repo.findLatestPlan(memberId);
    const result: WeighInResult = { ...logged, goalReached: false, planUpdated: false, plan: active ? toPlanView(active) : null };
    if (!active) return result;

    const target = active.targetWeightKg === null ? null : Number(active.targetWeightKg);
    // Within the calculator's tolerance counts as reached: closer than that, it no longer
    // treats the target as a goal to move toward.
    result.goalReached =
      target !== null &&
      ((active.direction === FitnessDirection.LOSS && weightKg <= target + TARGET_TOLERANCE_KG) ||
        (active.direction === FitnessDirection.GAIN && weightKg >= target - TARGET_TOLERANCE_KG));
    // At the goal the member chooses what's next; don't silently switch them to maintenance.
    if (result.goalReached) return result;
    if (Math.abs(weightKg - Number(active.weightKg)) < RECALCULATE_AFTER_KG) return result;

    try {
      const { input } = await loadPlanInput(this.repo, gymId, memberId, new Date());
      const options = buildFitnessPlanOptions(input);
      // Keep the member's pace if it is still allowed; otherwise fall back to the recommended one.
      const keep = options.options.find((o) => o.pace === active.goalPace && o.available);
      const pace = options.direction === FitnessDirection.MAINTAIN ? null : ((keep?.pace ?? null) as GoalPace | null);
      const saved = await this.repo.createPlan(planDataForPace(member, input, options, pace));
      return { ...result, planUpdated: true, plan: toPlanView(saved) };
    } catch (err) {
      // The weigh-in is saved either way. If the profile can no longer produce a plan
      // (consent withdrawn, target now invalid…), keep the old plan; the app prompts a redo.
      if (err instanceof DomainError) return result;
      throw err;
    }
  }
}
