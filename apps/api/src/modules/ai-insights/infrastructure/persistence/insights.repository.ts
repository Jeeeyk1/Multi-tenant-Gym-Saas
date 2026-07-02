import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import { METRIC_ENTITIES, type MetricQuery } from '../../application/tools/metric.whitelist';
import type { TrendQuery, TrendGranularity } from '../../application/tools/trend.whitelist';

const USAGE_FEATURE_KEY = 'ai_insights';
const ENTITLEMENT_FEATURE_KEY = 'ai_assistant';

interface MetricDelegate {
  count(args: { where: object }): Promise<number>;
  aggregate(args: object): Promise<Record<string, Record<string, number | null>>>;
  groupBy(args: object): Promise<Array<Record<string, unknown>>>;
}

export interface Entitlement {
  subscriptionId: string;
  organizationId: string;
  aiIncluded: boolean;
  quota: number;
  used: number;
}

interface TrendRow {
  period: Date;
  value: bigint | number;
}

@Injectable()
export class InsightsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── Metric tool ────────────────────────────────────────────────────────────

  async runMetric(gymId: string, query: MetricQuery) {
    const delegate = this.delegateFor(query.entity);
    const where = this.buildWhere(gymId, query);

    if (query.groupBy) {
      const rows = await delegate.groupBy({ by: [query.groupBy], where, ...this.aggregateArgs(query) });
      return {
        groupedBy: query.groupBy,
        rows: rows.map((row) => ({ group: String(row[query.groupBy!] ?? 'unknown'), value: this.readValue(query, row) })),
      };
    }

    if (query.aggregate === 'count') {
      return { value: await delegate.count({ where }) };
    }

    const result = await delegate.aggregate({ where, ...this.aggregateArgs(query) });
    return { value: this.readValue(query, result) };
  }

  private delegateFor(entity: MetricQuery['entity']): MetricDelegate {
    const map = {
      members: this.prisma.gymMember,
      checkins: this.prisma.checkIn,
      renewals: this.prisma.membershipRenewal,
    };
    return map[entity] as unknown as MetricDelegate;
  }

  private buildWhere(gymId: string, query: MetricQuery): Record<string, unknown> {
    // MembershipRenewal has no direct gymId — scope through the member relation.
    const gymScope = query.entity === 'renewals' ? { member: { gymId } } : { gymId };
    const where: Record<string, unknown> = { ...gymScope, ...query.where };
    if (query.range) {
      where[METRIC_ENTITIES[query.entity].dateField] = {
        ...(query.range.gte ? { gte: query.range.gte } : {}),
        ...(query.range.lte ? { lte: query.range.lte } : {}),
      };
    }
    return where;
  }

  private aggregateArgs(query: MetricQuery): object {
    if (query.aggregate === 'count') return { _count: { _all: true } };
    return { [`_${query.aggregate}`]: { [query.field!]: true } };
  }

  private readValue(query: MetricQuery, row: Record<string, unknown>): number {
    if (query.aggregate === 'count') {
      const count = row._count as { _all: number } | number;
      return typeof count === 'number' ? count : count._all;
    }
    const bucket = row[`_${query.aggregate}`] as Record<string, number | null>;
    return Number(bucket[query.field!] ?? 0);
  }

  // ── Trend tool ─────────────────────────────────────────────────────────────

  async runTrend(gymId: string, query: TrendQuery) {
    const { entity, granularity, field, from, to } = query;

    const rows =
      entity === 'checkins'
        ? await this.checkinsTrend(gymId, granularity, from, to)
        : entity === 'members'
          ? await this.membersTrend(gymId, granularity, from, to)
          : await this.renewalsTrend(gymId, granularity, from, to, field === 'amount');

    return {
      granularity,
      entity,
      rows: rows.map((row) => ({
        period: row.period instanceof Date ? row.period.toISOString().slice(0, 10) : String(row.period),
        value: Number(row.value),
      })),
    };
  }

  private checkinsTrend(gymId: string, gran: TrendGranularity, from: Date, to: Date) {
    const { trunc, interval } = granularityParts(gran);
    return this.prisma.$queryRaw<TrendRow[]>`
      SELECT DATE_TRUNC(${trunc}, series) AS period, COALESCE(data.value, 0)::int AS value
      FROM generate_series(${from}::timestamptz, ${to}::timestamptz, ${interval}::interval) AS series
      LEFT JOIN (
        SELECT DATE_TRUNC(${trunc}, c.checked_in_at) AS bucket, COUNT(*)::int AS value
        FROM check_ins c
        WHERE c.gym_id = ${gymId}::uuid AND c.checked_in_at BETWEEN ${from} AND ${to}
        GROUP BY 1
      ) AS data ON data.bucket = DATE_TRUNC(${trunc}, series)
      ORDER BY series
    `;
  }

  private membersTrend(gymId: string, gran: TrendGranularity, from: Date, to: Date) {
    const { trunc, interval } = granularityParts(gran);
    return this.prisma.$queryRaw<TrendRow[]>`
      SELECT DATE_TRUNC(${trunc}, series) AS period, COALESCE(data.value, 0)::int AS value
      FROM generate_series(${from}::timestamptz, ${to}::timestamptz, ${interval}::interval) AS series
      LEFT JOIN (
        SELECT DATE_TRUNC(${trunc}, gm.joined_at) AS bucket, COUNT(*)::int AS value
        FROM gym_members gm
        WHERE gm.gym_id = ${gymId}::uuid AND gm.joined_at BETWEEN ${from} AND ${to}
        GROUP BY 1
      ) AS data ON data.bucket = DATE_TRUNC(${trunc}, series)
      ORDER BY series
    `;
  }

  private renewalsTrend(gymId: string, gran: TrendGranularity, from: Date, to: Date, sumRevenue: boolean) {
    const { trunc, interval } = granularityParts(gran);
    if (sumRevenue) {
      return this.prisma.$queryRaw<TrendRow[]>`
        SELECT DATE_TRUNC(${trunc}, series) AS period, COALESCE(data.value, 0)::float AS value
        FROM generate_series(${from}::timestamptz, ${to}::timestamptz, ${interval}::interval) AS series
        LEFT JOIN (
          SELECT DATE_TRUNC(${trunc}, mr.renewed_at) AS bucket, SUM(mr.amount_paid)::float AS value
          FROM membership_renewals mr
          JOIN gym_members gm ON gm.id = mr.member_id
          WHERE gm.gym_id = ${gymId}::uuid AND mr.renewed_at BETWEEN ${from} AND ${to}
          GROUP BY 1
        ) AS data ON data.bucket = DATE_TRUNC(${trunc}, series)
        ORDER BY series
      `;
    }
    return this.prisma.$queryRaw<TrendRow[]>`
      SELECT DATE_TRUNC(${trunc}, series) AS period, COALESCE(data.value, 0)::int AS value
      FROM generate_series(${from}::timestamptz, ${to}::timestamptz, ${interval}::interval) AS series
      LEFT JOIN (
        SELECT DATE_TRUNC(${trunc}, mr.renewed_at) AS bucket, COUNT(*)::int AS value
        FROM membership_renewals mr
        JOIN gym_members gm ON gm.id = mr.member_id
        WHERE gm.gym_id = ${gymId}::uuid AND mr.renewed_at BETWEEN ${from} AND ${to}
        GROUP BY 1
      ) AS data ON data.bucket = DATE_TRUNC(${trunc}, series)
      ORDER BY series
    `;
  }

  // ── Member tools ───────────────────────────────────────────────────────────

  async findMembers(gymId: string, name: string) {
    const rows = await this.prisma.gymMember.findMany({
      where: { gymId, user: { fullName: { contains: name, mode: 'insensitive' } } },
      take: 5,
      select: { id: true, membershipNumber: true, status: true, user: { select: { fullName: true } } },
    });
    return rows.map((row) => ({
      memberId: row.id,
      name: row.user.fullName,
      membershipNumber: row.membershipNumber,
      status: row.status,
    }));
  }

  async getMemberCheckinStatus(gymId: string, memberId: string, dateStr?: string) {
    const member = await this.prisma.gymMember.findFirst({
      where: { id: memberId, gymId },
      select: { id: true, user: { select: { fullName: true } } },
    });
    if (!member) return { found: false };

    const day = dateStr ? new Date(dateStr) : new Date();
    const gte = startOfDay(day);
    const lte = endOfDay(day);

    const checkins = await this.prisma.checkIn.findMany({
      where: { memberId, gymId, checkedInAt: { gte, lte } },
      orderBy: { checkedInAt: 'desc' },
      select: { checkedInAt: true },
    });

    return {
      found: true,
      member: member.user.fullName,
      date: gte.toISOString().slice(0, 10),
      checkedIn: checkins.length > 0,
      count: checkins.length,
      lastCheckInAt: checkins[0]?.checkedInAt ?? null,
    };
  }

  // ── Entitlement + usage ──────────────────────────────────────────────────────

  async getEntitlement(gymId: string): Promise<Entitlement | null> {
    const gym = await this.prisma.gym.findUnique({ where: { id: gymId }, select: { organizationId: true } });
    if (!gym) return null;

    const subscription = await this.prisma.subscription.findFirst({
      where: { organizationId: gym.organizationId, status: { in: ['ACTIVE', 'TRIALING'] } },
      orderBy: { currentPeriodEnd: 'desc' },
      select: {
        id: true,
        aiTokensUsed: true,
        plan: {
          select: {
            aiTokenQuotaMonthly: true,
            features: { where: { featureKey: ENTITLEMENT_FEATURE_KEY }, select: { isIncluded: true } },
          },
        },
      },
    });
    if (!subscription) return null;

    return {
      subscriptionId: subscription.id,
      organizationId: gym.organizationId,
      aiIncluded: subscription.plan.features[0]?.isIncluded ?? false,
      quota: subscription.plan.aiTokenQuotaMonthly,
      used: subscription.aiTokensUsed,
    };
  }

  async recordUsage(entitlement: Entitlement, gymId: string, userId: string, tokens: number): Promise<void> {
    await this.prisma.subscription.update({
      where: { id: entitlement.subscriptionId },
      data: { aiTokensUsed: { increment: tokens } },
    });
    await this.prisma.aiUsageLog.create({
      data: { organizationId: entitlement.organizationId, gymId, userId, featureKey: USAGE_FEATURE_KEY, tokensUsed: tokens },
    });
  }
}

function granularityParts(gran: TrendGranularity): { trunc: string; interval: string } {
  const map: Record<TrendGranularity, { trunc: string; interval: string }> = {
    day: { trunc: 'day', interval: '1 day' },
    week: { trunc: 'week', interval: '1 week' },
    month: { trunc: 'month', interval: '1 month' },
  };
  return map[gran];
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}
