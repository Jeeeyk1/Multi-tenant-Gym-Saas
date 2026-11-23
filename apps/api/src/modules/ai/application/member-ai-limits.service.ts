import { Injectable } from '@nestjs/common';
import { TooManyRequestsError } from '../../../common/errors';
import { AiFeature } from '../../../common/enums';
import { localDate } from '../../../common/time/local-date';
import { AiRepository, type MemberContext } from '../infrastructure/persistence/ai.repository';
import { MONTHLY_MEMBER_AI_LIMITS } from '../domain/member-ai-limits';

export interface FeatureUsage {
  feature: AiFeature;
  used: number;
  limit: number;
  remaining: number;
}

export interface MemberAiUsage {
  /** When every count goes back to zero (start of next month, gym timezone). */
  resetsAt: Date;
  features: FeatureUsage[];
}

/**
 * Per-member monthly limits on member-facing AI, counted from ai_usage_log rows.
 */
@Injectable()
export class MemberAiLimitsService {
  constructor(private readonly aiRepository: AiRepository) {}

  async getUsage(ctx: Pick<MemberContext, 'userId' | 'gymId' | 'timezone'>): Promise<MemberAiUsage> {
    const month = await this.aiRepository.monthBounds(ctx.timezone);
    const counts = await this.aiRepository.countMemberUsage(ctx.userId, ctx.gymId, month.start);
    const features = Object.values(AiFeature).map((feature) => {
      const used = counts.get(feature) ?? 0;
      const limit = MONTHLY_MEMBER_AI_LIMITS[feature];
      return { feature, used, limit, remaining: Math.max(0, limit - used) };
    });
    return { resetsAt: month.end, features };
  }

  /**
   * Runs one AI call within the member's monthly limit. A usage row is reserved under a
   * per-member lock before the call, so parallel requests can't overshoot the limit.
   * Tokens are recorded as soon as the provider answers, before the answer is parsed, so
   * a reply that fails to parse still counts. If the provider call itself fails, nothing
   * was billed and the reservation is released.
   * Throws 429 MEMBER_AI_LIMIT_REACHED when the limit is used up.
   */
  async run<T extends { tokensUsed: number }>(
    ctx: Pick<MemberContext, 'organizationId' | 'userId' | 'gymId' | 'timezone'>,
    feature: AiFeature,
    call: () => Promise<T>,
  ): Promise<T> {
    const month = await this.aiRepository.monthBounds(ctx.timezone);
    const limit = MONTHLY_MEMBER_AI_LIMITS[feature];
    const reservationId = await this.aiRepository.reserveMemberUsage(ctx, feature, limit, month.start);
    if (!reservationId) {
      throw new TooManyRequestsError(
        `Monthly limit of ${limit} reached. It resets on ${localDate(month.end, ctx.timezone)}.`,
        'MEMBER_AI_LIMIT_REACHED',
      );
    }

    let result: T;
    try {
      result = await call();
    } catch (err) {
      await this.aiRepository.releaseUsage(reservationId);
      throw err;
    }
    await this.aiRepository.completeUsage(reservationId, result.tokensUsed);
    return result;
  }
}
