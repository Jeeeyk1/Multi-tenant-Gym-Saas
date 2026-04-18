import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma/prisma.service';

@Injectable()
export class MembershipPlansRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(planId: string, gymId: string) {
    return this.prisma.membershipPlan.findFirst({
      where: { id: planId, gymId },
      select: {
        id: true,
        gymId: true,
        name: true,
        type: true,
        description: true,
        price: true,
        durationDays: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  listByGym(gymId: string) {
    return this.prisma.membershipPlan.findMany({
      where: { gymId },
      select: {
        id: true,
        name: true,
        type: true,
        description: true,
        price: true,
        durationDays: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  create(data: {
    gymId: string;
    name: string;
    type: string;
    description?: string;
    price: number;
    durationDays: number;
  }) {
    return this.prisma.membershipPlan.create({
      data,
      select: {
        id: true,
        name: true,
        type: true,
        description: true,
        price: true,
        durationDays: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  update(
    planId: string,
    data: {
      name?: string;
      type?: string;
      description?: string;
      price?: number;
      durationDays?: number;
      isActive?: boolean;
    },
  ) {
    return this.prisma.membershipPlan.update({
      where: { id: planId },
      data: { ...data, updatedAt: new Date() },
      select: {
        id: true,
        name: true,
        type: true,
        description: true,
        price: true,
        durationDays: true,
        isActive: true,
        updatedAt: true,
      },
    });
  }
}
