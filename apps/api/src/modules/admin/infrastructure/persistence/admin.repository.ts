import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../../../common/prisma/prisma.service';

function timeStringToDate(time: string): Date {
  const [h, m, s] = time.split(':').map(Number);
  const d = new Date(0);
  d.setUTCHours(h, m ?? 0, s ?? 0, 0);
  return d;
}

const DEFAULT_SCHEDULES = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
  dayOfWeek,
  openTime: timeStringToDate('06:00'),
  closeTime: timeStringToDate('22:00'),
  isClosed: false,
}));

export interface CreateGymClientInput {
  orgName: string;
  orgSlug: string;
  gymName: string;
  gymCode: string;
  ownerEmail: string;
  ownerFullName: string;
}

@Injectable()
export class AdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  getPlatformStats() {
    return this.prisma.$transaction([
      this.prisma.gym.count(),
      this.prisma.gymMember.count(),
      this.prisma.checkIn.count({
        where: {
          checkedInAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      this.prisma.gym.count({ where: { status: 'ACTIVE' } }),
      this.prisma.user.count(),
    ]);
  }

  listGyms(page: number, limit: number) {
    const skip = (page - 1) * limit;
    return this.prisma.$transaction([
      this.prisma.gym.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          code: true,
          status: true,
          createdAt: true,
          organization: { select: { id: true, name: true, slug: true } },
          profile: { select: { logoUrl: true, primaryColor: true } },
          _count: { select: { members: true, staff: true } },
        },
      }),
      this.prisma.gym.count(),
    ]);
  }

  getGymById(id: string) {
    return this.prisma.gym.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        code: true,
        status: true,
        address: true,
        city: true,
        country: true,
        timezone: true,
        createdAt: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            members: {
              where: { role: 'OWNER' },
              take: 1,
              select: { user: { select: { emailVerifiedAt: true } } },
            },
          },
        },
        profile: { select: { logoUrl: true, primaryColor: true, secondaryColor: true, description: true } },
        _count: { select: { members: true, staff: true, checkIns: true } },
      },
    });
  }

  async findGymOwnerByGymId(gymId: string) {
    const gym = await this.prisma.gym.findUnique({
      where: { id: gymId },
      select: {
        name: true,
        code: true,
        organization: {
          select: {
            members: {
              where: { role: 'OWNER' },
              take: 1,
              select: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    fullName: true,
                    emailVerifiedAt: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!gym) return null;
    const user = gym.organization.members[0]?.user ?? null;
    if (!user) return null;
    return { ...user, gymName: gym.name, gymCode: gym.code };
  }

  async resendInviteForGymOwner(userId: string): Promise<string> {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.$transaction([
      this.prisma.userToken.updateMany({
        where: { userId, type: 'INVITE', isUsed: false },
        data: { isUsed: true },
      }),
      this.prisma.userToken.create({
        data: { userId, token, type: 'INVITE', expiresAt },
      }),
    ]);

    return token;
  }

  updateGymStatus(gymId: string, status: string) {
    return this.prisma.gym.update({
      where: { id: gymId },
      data: { status, updatedAt: new Date() },
      select: { id: true, name: true, status: true },
    });
  }

  listUsers(page: number, limit: number, gymId?: string) {
    const skip = (page - 1) * limit;
    const where = gymId
      ? {
          OR: [
            { gymMembers: { some: { gymId } } },
            { gymStaff: { some: { gymId } } },
          ],
        }
      : {};

    return this.prisma.$transaction([
      this.prisma.user.findMany({
        skip,
        take: limit,
        where,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          fullName: true,
          isActive: true,
          createdAt: true,
          gymStaff: { select: { gym: { select: { name: true, code: true } }, roles: { select: { role: { select: { name: true } } } } } },
          gymMembers: { select: { gym: { select: { name: true, code: true } }, status: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);
  }

  async createGymClient(input: CreateGymClientInput): Promise<{ inviteToken: string; gymId: string; orgId: string }> {
    const inviteToken = randomBytes(32).toString('hex');
    const checkinQrToken = randomBytes(24).toString('hex');

    const result = await this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name: input.orgName, slug: input.orgSlug.toLowerCase() },
      });

      const gym = await tx.gym.create({
        data: {
          organizationId: org.id,
          name: input.gymName,
          code: input.gymCode.toUpperCase(),
          checkinQrToken,
        },
      });

      await tx.gymProfile.create({ data: { gymId: gym.id } });

      await tx.gymSchedule.createMany({
        data: DEFAULT_SCHEDULES.map((s) => ({ gymId: gym.id, ...s })),
      });

      await tx.conversation.create({
        data: {
          gymId: gym.id,
          type: 'COMMUNITY',
          name: `${input.gymName} Community`,
          isDefault: true,
        },
      });

      const user = await tx.user.create({
        data: {
          email: input.ownerEmail.toLowerCase(),
          fullName: input.ownerFullName,
          isActive: true,
        },
      });

      await tx.organizationMember.create({
        data: { organizationId: org.id, userId: user.id, role: 'OWNER' },
      });

      // Add owner as gym staff with the GYM_OWNER role so they can log in
      // to the gym portal and have full permissions from day one.
      const gymOwnerRole = await tx.role.findFirstOrThrow({
        where: { name: 'GYM_OWNER' },
        select: { id: true },
      });

      const gymStaff = await tx.gymStaff.create({
        data: { gymId: gym.id, userId: user.id, isActive: true },
        select: { id: true },
      });

      await tx.gymStaffRole.create({
        data: { gymStaffId: gymStaff.id, roleId: gymOwnerRole.id },
      });

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      await tx.userToken.create({
        data: { userId: user.id, token: inviteToken, type: 'INVITE', expiresAt },
      });

      return { inviteToken, gymId: gym.id, orgId: org.id };
    });

    return result;
  }

  findOrgBySlug(slug: string) {
    return this.prisma.organization.findFirst({ where: { slug: slug.toLowerCase() } });
  }

  findGymByCode(code: string) {
    return this.prisma.gym.findFirst({ where: { code: code.toUpperCase() } });
  }

  findUserByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  }

  listPlans() {
    return this.prisma.saasPlan.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  createPlan(data: {
    name: string;
    description?: string;
    priceMonthly: number;
    priceYearly?: number;
    features: string[];
    isPopular?: boolean;
    isActive?: boolean;
    sortOrder?: number;
  }) {
    return this.prisma.saasPlan.create({ data });
  }

  updatePlan(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      priceMonthly: number;
      priceYearly: number;
      features: string[];
      isPopular: boolean;
      isActive: boolean;
      sortOrder: number;
    }>,
  ) {
    return this.prisma.saasPlan.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
  }

  deletePlan(id: string) {
    return this.prisma.saasPlan.delete({ where: { id } });
  }
}
