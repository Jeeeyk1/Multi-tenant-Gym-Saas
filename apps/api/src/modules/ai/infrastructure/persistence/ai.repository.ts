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
}
