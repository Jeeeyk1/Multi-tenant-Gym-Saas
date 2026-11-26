import { Injectable, Logger } from '@nestjs/common';
import { TooManyRequestsError } from '../../../common/errors';
import { AiFeature } from '../../../common/enums';
import { localDate } from '../../../common/time/local-date';
import { AiRepository, type MemberContext } from '../infrastructure/persistence/ai.repository';
import { MONTHLY_MEMBER_AI_LIMITS } from '../domain/member-ai-limits';
import { AiAllowanceService } from '../../ai-usage/application/ai-allowance.service';
import type { AiResponse } from '../../../common/adapters/ai/ai-provider.port';
import { costUsdMicros } from '../../../common/adapters/ai/ai-pricing';

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
  private readonly logger = new Logger(MemberAiLimitsService.name);

  constructor(
    private readonly aiRepository: AiRepository,
    private readonly allowance: AiAllowanceService,
  ) {}

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
   * Throws 429 MEMBER_AI_LIMIT_REACHED when the limit is used up, and 429 GYM_AI_ALLOWANCE_EXCEEDED
   * when the gym's monthly member AI allowance (by plan) is used up.
   */
  async run<T extends Pick<AiResponse, 'inputTokens' | 'outputTokens' | 'model'>>(
    ctx: Pick<MemberContext, 'organizationId' | 'userId' | 'gymId' | 'timezone'>,
    feature: AiFeature,
    call: () => Promise<T>,
  ): Promise<T> {
    // The gym's pool is checked first and not locked: at worst one call in flight goes slightly over.
    await this.allowance.assertMemberPoolAvailable(ctx.gymId);
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
    try {
      await this.aiRepository.completeUsage(reservationId, result);
      this.logger.log(
        `member AI usage gym=${ctx.gymId} feature=${feature} model=${result.model} in=${result.inputTokens} out=${result.outputTokens} costMicros=${costUsdMicros(result.model, result.inputTokens, result.outputTokens)}`,
      );
    } catch (err) {
      // The provider already answered (and billed us); keep the answer and leave enough to rebuild the row.
      this.logger.error(
        `member AI usage not recorded gym=${ctx.gymId} feature=${feature} usage=${reservationId} model=${result.model} in=${result.inputTokens} out=${result.outputTokens}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
    return result;
  }
}
