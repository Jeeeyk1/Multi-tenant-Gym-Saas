import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../../../common/prisma/prisma.service';

const INVITE_TOKEN_EXPIRY_DAYS = 7;

@Injectable()
export class StaffRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, fullName: true, isActive: true },
    });
  }

  findRoleById(roleId: string) {
    return this.prisma.role.findUnique({
      where: { id: roleId },
      select: { id: true, name: true },
    });
  }

  findStaffById(staffId: string, gymId: string) {
    return this.prisma.gymStaff.findFirst({
      where: { id: staffId, gymId },
      select: {
        id: true,
        gymId: true,
        userId: true,
        isActive: true,
        user: { select: { id: true, email: true, fullName: true } },
        roles: {
          select: {
            id: true,
            roleId: true,
            role: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  findStaffByUserId(userId: string, gymId: string) {
    return this.prisma.gymStaff.findUnique({
      where: { gymId_userId: { gymId, userId } },
      select: { id: true, isActive: true },
    });
  }

  findStaffRoleAssignment(gymStaffId: string, roleId: string) {
    return this.prisma.gymStaffRole.findUnique({
      where: { gymStaffId_roleId: { gymStaffId, roleId } },
      select: { id: true },
    });
  }

  /**
   * Creates a user (if new) + gym_staff record + invite token in one transaction.
   * If user already exists by email, skips user creation and links the existing user.
   */
  async inviteStaff(input: {
    gymId: string;
    email: string;
    fullName: string;
    phone?: string;
    existingUserId?: string;
  }): Promise<{ staffId: string; userId: string; inviteToken: string }> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITE_TOKEN_EXPIRY_DAYS);

    return this.prisma.$transaction(async (tx) => {
      let userId = input.existingUserId;

      if (!userId) {
        const user = await tx.user.create({
          data: {
            email: input.email,
            fullName: input.fullName,
            phone: input.phone,
          },
          select: { id: true },
        });
        userId = user.id;
      }

      const staff = await tx.gymStaff.create({
        data: { gymId: input.gymId, userId },
        select: { id: true },
      });

      const rawToken = randomBytes(32).toString('hex');

      await tx.userToken.create({
        data: {
          userId,
          token: rawToken,
          type: 'STAFF_INVITE',
          expiresAt,
        },
      });

      return { staffId: staff.id, userId, inviteToken: rawToken };
    });
  }

  async deactivate(staffId: string) {
    return this.prisma.gymStaff.update({
      where: { id: staffId },
      data: { isActive: false },
      select: { id: true, isActive: true },
    });
  }

  async assignRole(gymStaffId: string, roleId: string, assignedBy: string) {
    return this.prisma.gymStaffRole.create({
      data: { gymStaffId, roleId, assignedBy },
      select: { id: true, roleId: true, assignedAt: true },
    });
  }

  async removeRole(gymStaffId: string, roleId: string) {
    return this.prisma.gymStaffRole.delete({
      where: { gymStaffId_roleId: { gymStaffId, roleId } },
    });
  }

  listStaff(gymId: string) {
    return this.prisma.gymStaff.findMany({
      where: { gymId },
      select: {
        id: true,
        isActive: true,
        joinedAt: true,
        user: {
          select: { id: true, email: true, fullName: true, phone: true },
        },
        roles: {
          select: {
            id: true,
            assignedAt: true,
            role: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });
  }
}
