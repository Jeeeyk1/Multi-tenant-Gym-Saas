import { Injectable, Logger } from '@nestjs/common';
import { NotFoundError } from '../../../../common/errors';
import { AdminRepository } from '../../infrastructure/persistence/admin.repository';

const MICROS_PER_USD = 1_000_000;

/** Sets a billing plan's monthly AI allowances per gym (staff assistant, members' AI). */
@Injectable()
export class UpdateBillingPlanAiCapsUseCase {
  private readonly logger = new Logger(UpdateBillingPlanAiCapsUseCase.name);

  constructor(private readonly repo: AdminRepository) {}

  async execute(planId: string, input: { assistantAiCapUsd: number; memberAiCapUsd: number }, adminId: string) {
    const plan = await this.repo.findBillingPlan(planId);
    if (!plan) throw new NotFoundError('Billing plan not found', 'PLAN_NOT_FOUND');

    const updated = await this.repo.updateBillingPlanAiCaps(planId, {
      assistantAiCapUsdMicros: Math.round(input.assistantAiCapUsd * MICROS_PER_USD),
      memberAiCapUsdMicros: Math.round(input.memberAiCapUsd * MICROS_PER_USD),
    });
    this.logger.log(
      `billing plan AI caps changed plan=${planId} tier=${updated.tier} ` +
        `assistantMicros=${plan.assistantAiCapUsdMicros}->${updated.assistantAiCapUsdMicros} ` +
        `memberMicros=${plan.memberAiCapUsdMicros}->${updated.memberAiCapUsdMicros} by=${adminId}`,
    );
    return updated;
  }
}
