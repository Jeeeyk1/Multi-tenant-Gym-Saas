import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma/prisma.service';

export interface MemberContext {
  memberId: string;
  userId: string;
  fullName: string;
  gymId: string;
  gymName: string;
  organizationId: string;
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

  async logUsage(
    organizationId: string,
    gymId: string,
    userId: string,
    featureKey: string,
    tokensUsed: number,
  ): Promise<void> {
    await this.prisma.aiUsageLog.create({
      data: {
        organizationId,
        gymId,
        userId,
        featureKey,
        tokensUsed,
        metadata: {},
      },
    });
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

  listFoodLogs(memberId: string, limit: number) {
    return this.prisma.memberFoodLog.findMany({
      where: { memberId },
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
