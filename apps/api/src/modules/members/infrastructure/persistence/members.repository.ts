import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../../../common/prisma/prisma.service';

const INVITE_TOKEN_EXPIRY_DAYS = 7;
const MEMBERSHIP_NUMBER_PREFIX = 'MBR';
const SAFE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generateMembershipNumber(): string {
  const suffix = Array.from({ length: 8 }, () =>
    SAFE_CHARS[Math.floor(Math.random() * SAFE_CHARS.length)],
  ).join('');
  return `${MEMBERSHIP_NUMBER_PREFIX}-${suffix}`;
}

function generateQrToken(): string {
  return randomBytes(32).toString('hex');
}

@Injectable()
export class MembersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
  }

  findMemberByUserId(gymId: string, userId: string) {
    return this.prisma.gymMember.findUnique({
      where: { gymId_userId: { gymId, userId } },
      select: { id: true },
    });
  }

  findMemberById(memberId: string, gymId: string) {
    return this.prisma.gymMember.findFirst({
      where: { id: memberId, gymId },
      select: {
        id: true,
        gymId: true,
        membershipNumber: true,
        status: true,
        qrCodeToken: true,
        expiryDate: true,
        joinedAt: true,
        updatedAt: true,
        user: {
          select: { id: true, email: true, fullName: true, phone: true },
        },
        membershipPlan: {
          select: { id: true, name: true, type: true, price: true, durationDays: true },
        },
      },
    });
  }

  findPlanById(planId: string, gymId: string) {
    return this.prisma.membershipPlan.findFirst({
      where: { id: planId, gymId, isActive: true },
      select: { id: true, durationDays: true },
    });
  }

  findDefaultConversation(gymId: string) {
    return this.prisma.conversation.findFirst({
      where: { gymId, isDefault: true },
      select: { id: true },
    });
  }

  listMembers(gymId: string, skip: number, take: number) {
    return this.prisma.gymMember.findMany({
      where: { gymId },
      skip,
      take,
      select: {
        id: true,
        membershipNumber: true,
        status: true,
        expiryDate: true,
        joinedAt: true,
        user: {
          select: { id: true, email: true, fullName: true, phone: true },
        },
        membershipPlan: {
          select: { id: true, name: true, type: true },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });
  }

  countMembers(gymId: string) {
    return this.prisma.gymMember.count({ where: { gymId } });
  }

  updateStatus(memberId: string, status: string) {
    return this.prisma.gymMember.update({
      where: { id: memberId },
      data: { status, updatedAt: new Date() },
      select: { id: true, status: true, updatedAt: true },
    });
  }

  /**
   * Full registration transaction:
   * 1. Create user
   * 2. Generate unique membership_number + qr_code_token
   * 3. Create gym_member
   * 4. Create member_privacy
   * 5. Enroll in default community conversation (if exists)
   * 6. Create invite token
   */
  async registerMember(input: {
    gymId: string;
    email: string;
    fullName: string;
    phone?: string;
    planId?: string;
    expiryDate: Date;
  }): Promise<{ memberId: string; userId: string; membershipNumber: string; inviteToken: string }> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITE_TOKEN_EXPIRY_DAYS);

    const membershipNumber = generateMembershipNumber();
    const qrCodeToken = generateQrToken();
    const rawToken = randomBytes(32).toString('hex');

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email: input.email, fullName: input.fullName, phone: input.phone },
        select: { id: true },
      });

      const member = await tx.gymMember.create({
        data: {
          gymId: input.gymId,
          userId: user.id,
          membershipPlanId: input.planId ?? null,
          membershipNumber,
          qrCodeToken,
          expiryDate: input.expiryDate,
        },
        select: { id: true },
      });

      await tx.memberPrivacy.create({
        data: { memberId: member.id },
      });

      const defaultConversation = await tx.conversation.findFirst({
        where: { gymId: input.gymId, isDefault: true },
        select: { id: true },
      });

      if (defaultConversation) {
        await tx.conversationMember.create({
          data: { conversationId: defaultConversation.id, userId: user.id },
        });
      }

      await tx.userToken.create({
        data: { userId: user.id, token: rawToken, type: 'MEMBER_INVITE', expiresAt },
      });

      return {
        memberId: member.id,
        userId: user.id,
        membershipNumber,
        inviteToken: rawToken,
      };
    });
  }
}
