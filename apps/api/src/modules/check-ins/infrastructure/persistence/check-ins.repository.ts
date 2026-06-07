import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma/prisma.service';

@Injectable()
export class CheckInsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findGymForCheckin(gymId: string) {
    return this.prisma.gym.findUnique({
      where: { id: gymId },
      select: {
        id: true,
        status: true,
        timezone: true,
        is247: true,
        autoCheckoutHours: true,
        schedules: {
          select: { dayOfWeek: true, isClosed: true, openTime: true, closeTime: true },
        },
      },
    });
  }

  findMemberForCheckin(memberId: string, gymId: string) {
    return this.prisma.gymMember.findFirst({
      where: { id: memberId, gymId },
      select: { id: true, gymId: true, status: true, expiryDate: true },
    });
  }

  findMemberByUserId(userId: string, gymId: string) {
    return this.prisma.gymMember.findUnique({
      where: { gymId_userId: { gymId, userId } },
      select: { id: true, gymId: true, status: true, expiryDate: true },
    });
  }

  findMemberByQrToken(qrCodeToken: string, gymId: string) {
    return this.prisma.gymMember.findFirst({
      where: { qrCodeToken, gymId },
      select: { id: true, gymId: true, status: true, expiryDate: true },
    });
  }

  findActiveCheckin(memberId: string) {
    return this.prisma.checkIn.findFirst({
      where: { memberId, checkedOutAt: null },
      select: { id: true, checkedInAt: true },
    });
  }

  findCheckinById(checkinId: string, gymId: string) {
    return this.prisma.checkIn.findFirst({
      where: { id: checkinId, gymId },
      select: {
        id: true,
        memberId: true,
        gymId: true,
        method: true,
        checkedInAt: true,
        checkedOutAt: true,
        isOutOfHours: true,
        isAutoCheckout: true,
      },
    });
  }

  async createCheckin(data: {
    memberId: string;
    gymId: string;
    method: string;
    processedBy: string | null;
    isOutOfHours: boolean;
  }) {
    return this.prisma.checkIn.create({
      data,
      select: {
        id: true,
        memberId: true,
        gymId: true,
        method: true,
        processedBy: true,
        checkedInAt: true,
        isOutOfHours: true,
        isAutoCheckout: true,
      },
    });
  }

  async closeCheckin(checkinId: string, isAutoCheckout: boolean) {
    return this.prisma.checkIn.update({
      where: { id: checkinId },
      data: { checkedOutAt: new Date(), isAutoCheckout },
      select: { id: true, checkedOutAt: true, isAutoCheckout: true },
    });
  }

  listActiveCheckins(gymId: string) {
    return this.prisma.checkIn.findMany({
      where: { gymId, checkedOutAt: null },
      select: {
        id: true,
        method: true,
        checkedInAt: true,
        isOutOfHours: true,
        member: {
          select: {
            id: true,
            membershipNumber: true,
            privacy: { select: { hideCheckinVisibility: true } },
            user: { select: { id: true, fullName: true } },
          },
        },
      },
      orderBy: { checkedInAt: 'asc' },
    });
  }

  listCheckinHistory(gymId: string, skip: number, take: number) {
    return this.prisma.checkIn.findMany({
      where: { gymId },
      skip,
      take,
      select: {
        id: true,
        method: true,
        checkedInAt: true,
        checkedOutAt: true,
        isOutOfHours: true,
        isAutoCheckout: true,
        member: {
          select: {
            id: true,
            membershipNumber: true,
            user: { select: { id: true, fullName: true } },
          },
        },
      },
      orderBy: { checkedInAt: 'desc' },
    });
  }

  countCheckins(gymId: string) {
    return this.prisma.checkIn.count({ where: { gymId } });
  }

  listCheckinsByUserId(gymId: string, userId: string, limit: number) {
    return this.prisma.checkIn.findMany({
      where: { gymId, member: { userId } },
      take: limit,
      select: {
        id: true,
        method: true,
        checkedInAt: true,
        checkedOutAt: true,
        isOutOfHours: true,
        isAutoCheckout: true,
      },
      orderBy: { checkedInAt: 'desc' },
    });
  }
}
