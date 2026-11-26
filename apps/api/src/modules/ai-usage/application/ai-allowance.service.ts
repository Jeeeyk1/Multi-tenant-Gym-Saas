import { Injectable, Logger } from '@nestjs/common';
import { ForbiddenError, TooManyRequestsError } from '../../../common/errors';
import { localDate } from '../../../common/time/local-date';
import { costUsdMicros } from '../../../common/adapters/ai/ai-pricing';
import type { AuthenticatedUser } from '../../../common/types/auth.types';
import { AiUsageRepository, type GymAiPlan } from '../infrastructure/ai-usage.repository';
import {
  ASSISTANT_FEATURE_KEY,
  MEMBER_FEATURE_KEYS,
  assistantDailyLimit,
  isPoolExhausted,
  poolStatus,
  type PoolStatus,
} from '../domain/ai-allowance';

export interface AssistantUsage {
  pool: PoolStatus;
  today: { used: number; limit: number };
}

export interface AiCallUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Each gym's monthly AI allowance by plan (two pools: the staff assistant and members' AI),
 * plus the assistant's daily limit per person. AI is our cost, so checks fail closed: a gym
 * without an active subscription gets no AI.
 */
@Injectable()
export class AiAllowanceService {
  private readonly logger = new Logger(AiAllowanceService.name);

  constructor(private readonly repo: AiUsageRepository) {}

  async assistantUsage(gymId: string, caller: AuthenticatedUser): Promise<AssistantUsage | null> {
    const plan = await this.repo.findGymAiPlan(gymId);
    return plan ? this.assistantUsageFor(plan, gymId, caller) : null;
  }

  private async assistantUsageFor(plan: GymAiPlan, gymId: string, caller: AuthenticatedUser): Promise<AssistantUsage> {
    const [used, usedToday] = await Promise.all([
      this.repo.sumCost(gymId, [ASSISTANT_FEATURE_KEY], plan.periodStart),
      this.repo.countToday(gymId, caller.sub, ASSISTANT_FEATURE_KEY, plan.timezone),
    ]);
    return {
      pool: poolStatus(used, plan.assistantCapUsdMicros, plan.periodEnd),
      today: { used: usedToday, limit: assistantDailyLimit(caller) },
    };
  }

  async memberPool(gymId: string): Promise<PoolStatus | null> {
    const plan = await this.repo.findGymAiPlan(gymId);
    if (!plan) return null;
    const used = await this.repo.sumCost(gymId, MEMBER_FEATURE_KEYS, plan.periodStart);
    return poolStatus(used, plan.memberCapUsdMicros, plan.periodEnd);
  }

  /**
   * Throws unless this person may ask the assistant now. 403 FEATURE_NOT_AVAILABLE when the plan
   * has no assistant; 429 AI_ALLOWANCE_EXCEEDED when the gym's monthly pool is used up;
   * 429 AI_DAILY_LIMIT_REACHED for the person's daily questions.
   */
  async assertAssistantAvailable(gymId: string, caller: AuthenticatedUser): Promise<GymAiPlan> {
    const plan = await this.repo.findGymAiPlan(gymId);
    if (!plan || !plan.assistantIncluded) {
      throw new ForbiddenError("The AI assistant is not included in this gym's plan", 'FEATURE_NOT_AVAILABLE');
    }
    const usage = await this.assistantUsageFor(plan, gymId, caller);
    if (isPoolExhausted(usage.pool)) {
      this.logger.warn(`assistant allowance used up gym=${gymId} used=${usage.pool.usedUsdMicros} cap=${usage.pool.capUsdMicros}`);
      throw new TooManyRequestsError(
        `This month's AI assistant allowance is used up. It resets on ${localDate(plan.periodEnd, plan.timezone)}.`,
        'AI_ALLOWANCE_EXCEEDED',
      );
    }
    if (usage.today.used >= usage.today.limit) {
      throw new TooManyRequestsError(
        `You've asked ${usage.today.limit} questions today. The assistant is available again tomorrow.`,
        'AI_DAILY_LIMIT_REACHED',
      );
    }
    return plan;
  }

  /** Throws 429 GYM_AI_ALLOWANCE_EXCEEDED when the gym's member AI pool is used up (or there is no plan). */
  async assertMemberPoolAvailable(gymId: string): Promise<void> {
    const plan = await this.repo.findGymAiPlan(gymId);
    if (!plan) {
      throw new TooManyRequestsError("Your gym's AI features aren't available right now.", 'GYM_AI_ALLOWANCE_EXCEEDED');
    }
    const used = await this.repo.sumCost(gymId, MEMBER_FEATURE_KEYS, plan.periodStart);
    const pool = poolStatus(used, plan.memberCapUsdMicros, plan.periodEnd);
    if (isPoolExhausted(pool)) {
      this.logger.warn(`member AI allowance used up gym=${gymId} used=${pool.usedUsdMicros} cap=${pool.capUsdMicros}`);
      throw new TooManyRequestsError(
        `Your gym's AI features are paused for this month. They come back on ${localDate(plan.periodEnd, plan.timezone)}.`,
        'GYM_AI_ALLOWANCE_EXCEEDED',
      );
    }
  }

  /** Records one assistant question (all of its model steps) with its cost. */
  async recordAssistant(plan: GymAiPlan, gymId: string, userId: string, usage: AiCallUsage): Promise<void> {
    const cost = costUsdMicros(usage.model, usage.inputTokens, usage.outputTokens);
    await this.repo.record({ organizationId: plan.organizationId, gymId, userId, featureKey: ASSISTANT_FEATURE_KEY, ...usage, costUsdMicros: cost });
    this.logger.log(`assistant usage gym=${gymId} user=${userId} model=${usage.model} in=${usage.inputTokens} out=${usage.outputTokens} costMicros=${cost}`);
  }
}
