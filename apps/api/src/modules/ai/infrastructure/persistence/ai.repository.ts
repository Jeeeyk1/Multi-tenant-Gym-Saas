import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import { localDayBounds } from '../../../../common/prisma/local-day-bounds';
import { localDate } from '../../../../common/time/local-date';
import { costUsdMicros } from '../../../../common/adapters/ai/ai-pricing';

export interface MemberContext {
  memberId: string;
  userId: string;
  fullName: string;
  gymId: string;
  gymName: string;
  organizationId: string;
  timezone: string;
  age: number | null;
  weightKg: number | null;
  targetWeightKg: number | null;
  heightCm: number | null;
  fitnessGoal: string | null;
  activityLevel: string | null;
  daysPerWeek: number | null;
  experienceLevel: string | null;
  preferredStyle: string | null;
  dietType: string;
  injuries: string | null;
  recentCheckInsCount: number;
}

export interface PlanTargets {
  kcal: number;
  proteinG: number;
}

export interface CreateFoodLogData {
  description: string;
  calories?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
}

@Injectable()
export class AiRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMemberContext(memberId: string, gymId: string): Promise<MemberContext | null> {
    const member = await this.prisma.gymMember.findFirst({
      where: { id: memberId, gymId },
      select: {
        id: true,
        userId: true,
        gym: {
          select: {
            id: true,
            name: true,
            organizationId: true,
            timezone: true,
          },
        },
        user: { select: { fullName: true } },
        profile: {
          select: {
            age: true,
            weightKg: true,
            targetWeightKg: true,
            heightCm: true,
            fitnessGoal: true,
            activityLevel: true,
            daysPerWeek: true,
            experienceLevel: true,
            preferredStyle: true,
            dietType: true,
            injuries: true,
          },
        },
        checkIns: {
          where: {
            checkedInAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
          select: { id: true },
        },
      },
    });

    if (!member) return null;

    return {
      memberId: member.id,
      userId: member.userId,
      fullName: member.user.fullName,
      gymId: member.gym.id,
      gymName: member.gym.name,
      organizationId: member.gym.organizationId,
      timezone: member.gym.timezone,
      age: member.profile?.age ?? null,
      weightKg: member.profile?.weightKg ? Number(member.profile.weightKg) : null,
      targetWeightKg: member.profile?.targetWeightKg ? Number(member.profile.targetWeightKg) : null,
      heightCm: member.profile?.heightCm ?? null,
      fitnessGoal: member.profile?.fitnessGoal ?? null,
      activityLevel: member.profile?.activityLevel ?? null,
      daysPerWeek: member.profile?.daysPerWeek ?? null,
      experienceLevel: member.profile?.experienceLevel ?? null,
      preferredStyle: member.profile?.preferredStyle ?? null,
      dietType: member.profile?.dietType ?? 'NONE',
      injuries: member.profile?.injuries ?? null,
      recentCheckInsCount: member.checkIns.length,
    };
  }

  /** Start and end of the current calendar month in `timeZone`, as instants. */
  async monthBounds(timeZone: string): Promise<{ start: Date; end: Date }> {
    const [bounds] = await this.prisma.$queryRaw<{ start: Date; end: Date }[]>`
      SELECT (date_trunc('month', now() AT TIME ZONE ${timeZone}) AT TIME ZONE ${timeZone})                      AS "start",
             ((date_trunc('month', now() AT TIME ZONE ${timeZone}) + interval '1 month') AT TIME ZONE ${timeZone}) AS "end"
    `;
    return bounds;
  }

  /** How many times a member used each feature since `since`, in this gym. */
  async countMemberUsage(userId: string, gymId: string, since: Date): Promise<Map<string, number>> {
    const rows = await this.prisma.aiUsageLog.groupBy({
      by: ['featureKey'],
      where: { userId, gymId, usedAt: { gte: since } },
      _count: { _all: true },
    });
    return new Map(rows.map((r) => [r.featureKey, r._count._all]));
  }

  /**
   * Reserves one use of `feature` for this member if they are under `limit` since
   * `since`. Count and insert happen under a per-member, per-feature advisory lock so
   * concurrent requests are serialised. Returns the reserved row id, or null at the limit.
   */
  reserveMemberUsage(
    ctx: { organizationId: string; gymId: string; userId: string },
    feature: string,
    limit: number,
    since: Date,
  ): Promise<string | null> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${ctx.userId}:${feature}`}))`;
      const used = await tx.aiUsageLog.count({
        where: { userId: ctx.userId, gymId: ctx.gymId, featureKey: feature, usedAt: { gte: since } },
      });
      if (used >= limit) return null;
      const row = await tx.aiUsageLog.create({
        data: {
          organizationId: ctx.organizationId,
          gymId: ctx.gymId,
          userId: ctx.userId,
          featureKey: feature,
          tokensUsed: 0,
          metadata: { status: 'reserved' },
        },
        select: { id: true },
      });
      return row.id;
    });
  }

  /** Records what a reserved call actually used and cost. */
  async completeUsage(id: string, usage: { model: string; inputTokens: number; outputTokens: number }): Promise<void> {
    await this.prisma.aiUsageLog.update({
      where: { id },
      data: {
        model: usage.model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        tokensUsed: usage.inputTokens + usage.outputTokens,
        costUsdMicros: costUsdMicros(usage.model, usage.inputTokens, usage.outputTokens),
        metadata: {},
      },
    });
  }

  /** Drops a reservation whose provider call failed (nothing was billed). */
  async releaseUsage(id: string): Promise<void> {
    await this.prisma.aiUsageLog.delete({ where: { id } });
  }

  /** What a member has eaten today (gym timezone), for "what's left today". */
  async sumFoodToday(memberId: string, timeZone: string): Promise<{ kcal: number; proteinG: number }> {
    const today = localDate(new Date(), timeZone);
    const { start, end } = await localDayBounds(this.prisma, today, timeZone);
    const result = await this.prisma.memberFoodLog.aggregate({
      where: { memberId, loggedAt: { gte: start, lt: end } },
      _sum: { calories: true, proteinG: true },
    });
    return { kcal: result._sum.calories ?? 0, proteinG: Math.round(Number(result._sum.proteinG ?? 0)) };
  }

  /** Daily targets from the member's active fitness plan, or null if they have none. */
  async findActivePlanTargets(memberId: string): Promise<PlanTargets | null> {
    const plan = await this.prisma.memberFitnessPlan.findFirst({
      where: { memberId },
      orderBy: { createdAt: 'desc' },
      select: { targetKcal: true, proteinG: true },
    });
    return plan ? { kcal: plan.targetKcal, proteinG: plan.proteinG } : null;
  }

  createFoodLog(memberId: string, data: CreateFoodLogData) {
    return this.prisma.memberFoodLog.create({
      data: {
        memberId,
        description: data.description,
        calories: data.calories,
        proteinG: data.proteinG,
        carbsG: data.carbsG,
        fatG: data.fatG,
      },
      select: {
        id: true,
        description: true,
        calories: true,
        proteinG: true,
        carbsG: true,
        fatG: true,
        loggedAt: true,
      },
    });
  }

  /** The timezone of the member's gym, or null if the member is not in this gym. */
  async findMemberGymTimezone(memberId: string, gymId: string): Promise<string | null> {
    const member = await this.prisma.gymMember.findFirst({
      where: { id: memberId, gymId },
      select: { gym: { select: { timezone: true } } },
    });
    return member?.gym.timezone ?? null;
  }

  async listFoodLogs(memberId: string, limit: number, day?: { date: string; timezone: string }) {
    let loggedAt: { gte: Date; lt: Date } | undefined;
    if (day) {
      const { start, end } = await localDayBounds(this.prisma, day.date, day.timezone);
      loggedAt = { gte: start, lt: end };
    }
    return this.prisma.memberFoodLog.findMany({
      where: { memberId, loggedAt },
      orderBy: { loggedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        description: true,
        calories: true,
        proteinG: true,
        carbsG: true,
        fatG: true,
        loggedAt: true,
      },
    });
  }

  async saveWorkoutPlan(memberId: string, gymId: string, suggestion: string): Promise<void> {
    await this.prisma.memberWorkoutPlan.upsert({
      where: { memberId },
      create: { memberId, gymId, suggestion, generatedAt: new Date() },
      update: { suggestion, generatedAt: new Date() },
    });
  }

  getLatestWorkoutPlan(memberId: string) {
    return this.prisma.memberWorkoutPlan.findUnique({
      where: { memberId },
      select: { suggestion: true, generatedAt: true },
    });
  }

  async saveMealPlan(memberId: string, gymId: string, suggestion: string): Promise<void> {
    await this.prisma.memberMealPlan.upsert({
      where: { memberId },
      create: { memberId, gymId, suggestion, generatedAt: new Date() },
      update: { suggestion, generatedAt: new Date() },
    });
  }

  getLatestMealPlan(memberId: string) {
    return this.prisma.memberMealPlan.findUnique({
      where: { memberId },
      select: { suggestion: true, generatedAt: true },
    });
  }

  getExerciseMedia(normalizedName: string) {
    return this.prisma.exerciseMedia.findUnique({
      where: { normalizedName },
      select: { gifUrl: true },
    });
  }

  async upsertExerciseMedia(normalizedName: string, gifUrl: string): Promise<void> {
    await this.prisma.exerciseMedia.upsert({
      where: { normalizedName },
      create: { normalizedName, gifUrl },
      update: { gifUrl, fetchedAt: new Date() },
    });
  }

  async listExercisesGrouped(): Promise<Record<string, string[]>> {
    const rows = await this.prisma.exerciseMedia.findMany({
      where: { primaryMuscles: { not: null }, category: { not: null } },
      select: { normalizedName: true, primaryMuscles: true },
      orderBy: { normalizedName: 'asc' },
    });

    const groups: Record<string, string[]> = {};
    for (const row of rows) {
      const muscle = row.primaryMuscles!;
      if (!groups[muscle]) groups[muscle] = [];
      if (groups[muscle].length < 20) {
        groups[muscle].push(toTitleCase(row.normalizedName));
      }
    }
    return groups;
  }
}

function toTitleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}
