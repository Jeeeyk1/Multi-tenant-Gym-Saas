import { Injectable } from '@nestjs/common';
import { BillingRepository } from '../../infrastructure/persistence/billing.repository';
import { CacheService } from '../../../../common/cache/cache.service';
import { ConflictError, NotFoundError } from '../../../../common/errors';
import { SubscriptionStatus } from '../../../../common/enums';
import { addDays } from '../../domain/billing.constants';

/**
 * Admin action: grant a gym more trial days. Works whether the trial is still
 * running (pushes the end date out) or has already lapsed into "asking for
 * payment" (reopens it to TRIALING and voids the unpaid invoice — handled in the
 * repository). Busts the subscription-status cache so the gym unlocks immediately.
 */
@Injectable()
export class ExtendTrialUseCase {
  constructor(
    private readonly billing: BillingRepository,
    private readonly cache: CacheService,
  ) {}

  async execute(gymId: string, additionalDays: number): Promise<{ trialEndsAt: Date }> {
    const sub = await this.billing.getLatestSubscriptionByGym(gymId);
    if (!sub) throw new NotFoundError('No subscription found for this gym', 'SUBSCRIPTION_NOT_FOUND');

    // Only a trial or an as-yet-unpaid gym can be moved onto (or kept on) a trial.
    if (sub.status !== SubscriptionStatus.TRIALING && sub.status !== SubscriptionStatus.PENDING_PAYMENT) {
      throw new ConflictError(
        `Cannot extend a trial for a ${sub.status} subscription`,
        'TRIAL_EXTEND_NOT_ALLOWED',
      );
    }

    // Extend from the later of "now" or the current end, so extending an already-lapsed
    // trial gives a fresh window rather than adding days in the past.
    const now = new Date();
    const base = sub.currentPeriodEnd && sub.currentPeriodEnd > now ? sub.currentPeriodEnd : now;
    const trialEndsAt = addDays(base, additionalDays);

    const gymIds = await this.billing.extendTrial(sub.id, sub.organizationId, trialEndsAt);
    await Promise.all(gymIds.map((id) => this.cache.del(`sub:status:${id}`)));

    return { trialEndsAt };
  }
}
