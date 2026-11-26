import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { SubscriptionStatus } from '../../../common/enums';

const ASSISTANT_PLAN_FEATURE = 'ai_assistant';

export interface GymAiPlan {
  organizationId: string;
  timezone: string;
  /** The current calendar month in the gym's timezone. Caps are monthly even on yearly billing. */
  periodStart: Date;
  periodEnd: Date;
  assistantIncluded: boolean;
  assistantCapUsdMicros: number;
  memberCapUsdMicros: number;
}

export interface UsageRecord {
  organizationId: string;
  gymId: string;
  userId: string;
  featureKey: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsdMicros: number;
}

@Injectable()
export class AiUsageRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** The gym's AI caps (from its organization's active subscription) and the current month. */
  async findGymAiPlan(gymId: string): Promise<GymAiPlan | null> {
    const gym = await this.prisma.gym.findUnique({ where: { id: gymId }, select: { organizationId: true, timezone: true } });
    if (!gym) return null;
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        organizationId: gym.organizationId,
        status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
      },
      orderBy: { currentPeriodEnd: 'desc' },
      select: {
        plan: {
          select: {
            assistantAiCapUsdMicros: true,
            memberAiCapUsdMicros: true,
            features: { where: { featureKey: ASSISTANT_PLAN_FEATURE }, select: { isIncluded: true } },
          },
        },
      },
    });
    if (!subscription) return null;
    const month = await this.monthBounds(gym.timezone);
    return {
      organizationId: gym.organizationId,
      timezone: gym.timezone,
      periodStart: month.start,
      periodEnd: month.end,
      assistantIncluded: subscription.plan.features[0]?.isIncluded ?? false,
      assistantCapUsdMicros: subscription.plan.assistantAiCapUsdMicros,
      memberCapUsdMicros: subscription.plan.memberAiCapUsdMicros,
    };
  }

  /** Start and end of the current calendar month in `timeZone`, as instants. */
  private async monthBounds(timeZone: string): Promise<{ start: Date; end: Date }> {
    const [bounds] = await this.prisma.$queryRaw<{ start: Date; end: Date }[]>`
      SELECT (date_trunc('month', now() AT TIME ZONE ${timeZone}) AT TIME ZONE ${timeZone})                      AS "start",
             ((date_trunc('month', now() AT TIME ZONE ${timeZone}) + interval '1 month') AT TIME ZONE ${timeZone}) AS "end"
    `;
    return bounds;
  }

  /** What the gym spent on these features since `since`, in micro-dollars. */
  async sumCost(gymId: string, featureKeys: readonly string[], since: Date): Promise<number> {
    const result = await this.prisma.aiUsageLog.aggregate({
      _sum: { costUsdMicros: true },
      where: { gymId, featureKey: { in: [...featureKeys] }, usedAt: { gte: since } },
    });
    return result._sum.costUsdMicros ?? 0;
  }

  /** How many times this person used the feature today, in the gym's timezone. */
  async countToday(gymId: string, userId: string, featureKey: string, timeZone: string): Promise<number> {
    const [row] = await this.prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS count
      FROM ai_usage_log
      WHERE gym_id = ${gymId}::uuid
        AND user_id = ${userId}::uuid
        AND feature_key = ${featureKey}
        AND used_at >= (date_trunc('day', now() AT TIME ZONE ${timeZone}) AT TIME ZONE ${timeZone})
    `;
    return row?.count ?? 0;
  }

  async record(usage: UsageRecord): Promise<void> {
    await this.prisma.aiUsageLog.create({
      data: { ...usage, tokensUsed: usage.inputTokens + usage.outputTokens },
    });
  }
}
