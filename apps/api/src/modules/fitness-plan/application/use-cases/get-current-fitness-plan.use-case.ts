import { Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../common/errors';
import { FitnessPlanRepository } from '../../infrastructure/persistence/fitness-plan.repository';
import { toPlanView, type FitnessPlanView } from '../plan-input';

/**
 * The member's active (most recent) plan. Wrapped so "no plan yet" is a JSON body
 * (`{ "plan": null }`) rather than an empty response.
 */
@Injectable()
export class GetCurrentFitnessPlanUseCase {
  constructor(private readonly repo: FitnessPlanRepository) {}

  async execute(gymId: string, memberId: string): Promise<{ plan: FitnessPlanView | null }> {
    const member = await this.repo.findMember(memberId, gymId);
    if (!member) throw new NotFoundError('Member not found', 'MEMBER_NOT_FOUND');

    const plan = await this.repo.findLatestPlan(memberId);
    return { plan: plan ? toPlanView(plan) : null };
  }
}
