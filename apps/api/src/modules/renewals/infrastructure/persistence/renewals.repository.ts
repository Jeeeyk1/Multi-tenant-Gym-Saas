import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma/prisma.service';

@Injectable()
export class RenewalsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMemberForRenewal(memberId: string, gymId: string) {
    return this.prisma.gymMember.findFirst({
      where: { id: memberId, gymId },
      select: { id: true, status: true, expiryDate: true, membershipPlanId: true },
    });
  }

  findPlanById(planId: string, gymId: string) {
    return this.prisma.membershipPlan.findFirst({
      where: { id: planId, gymId, isActive: true },
      select: { id: true, durationDays: true },
    });
  }

  listRenewals(memberId: string) {
    return this.prisma.membershipRenewal.findMany({
      where: { memberId },
      select: {
        id: true,
        previousExpiry: true,
        newExpiry: true,
        amountPaid: true,
        paymentMethod: true,
        notes: true,
        renewedAt: true,
        renewedByUser: { select: { id: true, fullName: true } },
      },
      orderBy: { renewedAt: 'desc' },
    });
  }

  listGymRenewals(gymId: string, limit: number) {
    return this.prisma.membershipRenewal.findMany({
      where: { member: { gymId } },
      select: {
        id: true,
        previousExpiry: true,
        newExpiry: true,
        amountPaid: true,
        paymentMethod: true,
        notes: true,
        renewedAt: true,
        renewedByUser: { select: { id: true, fullName: true } },
        member: {
          select: {
            id: true,
            membershipNumber: true,
            user: { select: { id: true, fullName: true } },
            membershipPlan: { select: { id: true, name: true, type: true } },
          },
        },
      },
      orderBy: { renewedAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Processes a renewal in a single transaction:
   * 1. Update gym_member: new expiryDate + status = ACTIVE
   * 2. Insert membership_renewals audit record
   */
  async processRenewal(input: {
    memberId: string;
    planId?: string;
    previousExpiry: Date;
    newExpiry: Date;
    amountPaid: number;
    paymentMethod?: string;
    notes?: string;
    renewedBy: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      await tx.gymMember.update({
        where: { id: input.memberId },
        data: {
          expiryDate: input.newExpiry,
          status: 'ACTIVE',
          membershipPlanId: input.planId ?? undefined,
          updatedAt: new Date(),
        },
      });

      const renewal = await tx.membershipRenewal.create({
        data: {
          memberId: input.memberId,
          previousExpiry: input.previousExpiry,
          newExpiry: input.newExpiry,
          amountPaid: input.amountPaid,
          paymentMethod: input.paymentMethod,
          notes: input.notes,
          renewedBy: input.renewedBy,
        },
        select: {
          id: true,
          previousExpiry: true,
          newExpiry: true,
          amountPaid: true,
          paymentMethod: true,
          notes: true,
          renewedAt: true,
        },
      });

      return renewal;
    });
  }
}
