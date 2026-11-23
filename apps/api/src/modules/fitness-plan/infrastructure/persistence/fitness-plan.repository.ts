import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import { localDayBounds } from '../../../../common/prisma/local-day-bounds';

export interface FitnessPlanMember {
  memberId: string;
  gymId: string;
  timezone: string;
  profile: {
    sex: string | null;
    age: number | null;
    heightCm: number | null;
    weightKg: number | null;
    targetWeightKg: number | null;
    activityLevel: string | null;
    fitnessGoal: string | null;
    healthCaution: boolean;
    healthDataConsentAt: Date | null;
  } | null;
}

export interface CreateFitnessPlanData {
  memberId: string;
  gymId: string;
  calculatorVersion: number;
  sex: string;
  age: number;
  heightCm: number;
  weightKg: number;
  targetWeightKg: number | null;
  activityLevel: string;
  fitnessGoal: string;
  direction: string;
  goalPace: string | null;
  bmrKcal: number;
  tdeeKcal: number;
  targetKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  waterMl: number;
  weeklyRateKg: number;
  /** YYYY-MM-DD */
  targetDate: string | null;
}

export interface DailyFoodTotals {
  entries: number;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

const PLAN_SELECT = {
  id: true,
  calculatorVersion: true,
  direction: true,
  goalPace: true,
  fitnessGoal: true,
  weightKg: true,
  targetWeightKg: true,
  bmrKcal: true,
  tdeeKcal: true,
  targetKcal: true,
  proteinG: true,
  carbsG: true,
  fatG: true,
  waterMl: true,
  weeklyRateKg: true,
  targetDate: true,
  createdAt: true,
} satisfies Prisma.MemberFitnessPlanSelect;

export type StoredFitnessPlan = Prisma.MemberFitnessPlanGetPayload<{ select: typeof PLAN_SELECT }>;

@Injectable()
export class FitnessPlanRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** The member with the profile fields the calculator needs, or null if not in this gym. */
  async findMember(memberId: string, gymId: string): Promise<FitnessPlanMember | null> {
    const member = await this.prisma.gymMember.findFirst({
      where: { id: memberId, gymId },
      select: {
        id: true,
        gym: { select: { id: true, timezone: true } },
        profile: {
          select: {
            sex: true,
            age: true,
            heightCm: true,
            weightKg: true,
            targetWeightKg: true,
            activityLevel: true,
            fitnessGoal: true,
            healthCaution: true,
            healthDataConsentAt: true,
          },
        },
      },
    });
    if (!member) return null;

    const p = member.profile;
    return {
      memberId: member.id,
      gymId: member.gym.id,
      timezone: member.gym.timezone,
      profile: p
        ? {
            ...p,
            weightKg: p.weightKg === null ? null : Number(p.weightKg),
            targetWeightKg: p.targetWeightKg === null ? null : Number(p.targetWeightKg),
          }
        : null,
    };
  }

  createPlan(data: CreateFitnessPlanData): Promise<StoredFitnessPlan> {
    return this.prisma.memberFitnessPlan.create({
      data: {
        ...data,
        targetDate: data.targetDate ? new Date(`${data.targetDate}T00:00:00Z`) : null,
      },
      select: PLAN_SELECT,
    });
  }

  findLatestPlan(memberId: string): Promise<StoredFitnessPlan | null> {
    return this.prisma.memberFitnessPlan.findFirst({
      where: { memberId },
      orderBy: { createdAt: 'desc' },
      select: PLAN_SELECT,
    });
  }

  /** The most recent plan saved before `before`: the plan that was active at that moment. */
  findPlanActiveAt(memberId: string, before: Date): Promise<StoredFitnessPlan | null> {
    return this.prisma.memberFitnessPlan.findFirst({
      where: { memberId, createdAt: { lt: before } },
      orderBy: { createdAt: 'desc' },
      select: PLAN_SELECT,
    });
  }

  dayBounds(date: string, timeZone: string): Promise<{ start: Date; end: Date }> {
    return localDayBounds(this.prisma, date, timeZone);
  }

  async sumFoodLogs(memberId: string, range: { start: Date; end: Date }): Promise<DailyFoodTotals> {
    const result = await this.prisma.memberFoodLog.aggregate({
      where: { memberId, loggedAt: { gte: range.start, lt: range.end } },
      _sum: { calories: true, proteinG: true, carbsG: true, fatG: true },
      _count: { _all: true },
    });
    return {
      entries: result._count._all,
      kcal: result._sum.calories ?? 0,
      proteinG: Math.round(Number(result._sum.proteinG ?? 0)),
      carbsG: Math.round(Number(result._sum.carbsG ?? 0)),
      fatG: Math.round(Number(result._sum.fatG ?? 0)),
    };
  }
}
