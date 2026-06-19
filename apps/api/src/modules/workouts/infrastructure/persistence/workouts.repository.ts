import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma/prisma.service';

export interface LogSessionInput {
  memberId: string;
  gymId: string;
  workoutType: string;
  startedAt: Date;
  endedAt: Date;
  durationMinutes: number;
  caloriesBurned?: number;
  avgHeartRate?: number;
  notes?: string;
}

@Injectable()
export class WorkoutsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMemberByUserId(gymId: string, userId: string) {
    return this.prisma.gymMember.findUnique({
      where: { gymId_userId: { gymId, userId } },
      select: { id: true, status: true },
    });
  }

  async logSession(input: LogSessionInput) {
    return this.prisma.workoutSession.create({
      data: {
        memberId: input.memberId,
        gymId: input.gymId,
        workoutType: input.workoutType,
        startedAt: input.startedAt,
        endedAt: input.endedAt,
        durationMinutes: input.durationMinutes,
        caloriesBurned: input.caloriesBurned ?? null,
        avgHeartRate: input.avgHeartRate ?? null,
        notes: input.notes ?? null,
        source: 'manual',
      },
      select: {
        id: true,
        workoutType: true,
        startedAt: true,
        endedAt: true,
        durationMinutes: true,
        caloriesBurned: true,
        avgHeartRate: true,
        source: true,
        createdAt: true,
      },
    });
  }

  listSessions(memberId: string, skip: number, take: number) {
    return this.prisma.workoutSession.findMany({
      where: { memberId },
      orderBy: { startedAt: 'desc' },
      skip,
      take,
      select: {
        id: true,
        workoutType: true,
        startedAt: true,
        endedAt: true,
        durationMinutes: true,
        caloriesBurned: true,
        avgHeartRate: true,
        source: true,
        createdAt: true,
      },
    });
  }

  countSessions(memberId: string) {
    return this.prisma.workoutSession.count({ where: { memberId } });
  }
}
