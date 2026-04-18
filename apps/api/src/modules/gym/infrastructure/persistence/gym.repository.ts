import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../../../common/prisma/prisma.service';

// 0 = Sunday … 6 = Saturday (matches JS Date.getDay())
const DEFAULT_SCHEDULES = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
  dayOfWeek,
  openTime: '06:00',
  closeTime: '22:00',
  isClosed: false,
}));

@Injectable()
export class GymRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByCode(code: string) {
    return this.prisma.gym.findUnique({
      where: { code: code.toUpperCase() },
      select: {
        id: true,
        name: true,
        code: true,
        status: true,
        timezone: true,
        city: true,
        country: true,
      },
    });
  }

  findById(gymId: string) {
    return this.prisma.gym.findUnique({
      where: { id: gymId },
      select: {
        id: true,
        name: true,
        code: true,
        status: true,
        timezone: true,
        address: true,
        city: true,
        country: true,
        is247: true,
        autoCheckoutHours: true,
        autoSuspendMonths: true,
        organizationId: true,
        createdAt: true,
        profile: {
          select: {
            description: true,
            logoUrl: true,
            coverPhotoUrl: true,
            contactEmail: true,
            contactPhone: true,
            primaryColor: true,
            secondaryColor: true,
            accentColor: true,
          },
        },
        schedules: {
          select: {
            dayOfWeek: true,
            openTime: true,
            closeTime: true,
            isClosed: true,
          },
          orderBy: { dayOfWeek: 'asc' },
        },
      },
    });
  }

  /**
   * Checks whether a given gym code is already in use.
   */
  async isCodeTaken(code: string): Promise<boolean> {
    const count = await this.prisma.gym.count({ where: { code } });
    return count > 0;
  }

  /**
   * Creates a gym and all required auto-records in a single transaction:
   * - gym
   * - gym_profile
   * - 7 gym_schedule rows (Mon–Sun defaults)
   * - community conversation
   */
  async createWithDefaults(input: {
    organizationId: string;
    name: string;
    code: string;
    timezone?: string;
    address?: string;
    city?: string;
    country?: string;
  }) {
    const checkinQrToken = randomBytes(24).toString('hex');

    return this.prisma.$transaction(async (tx) => {
      const gym = await tx.gym.create({
        data: {
          organizationId: input.organizationId,
          name: input.name,
          code: input.code,
          timezone: input.timezone ?? 'Asia/Manila',
          address: input.address,
          city: input.city,
          country: input.country ?? 'Philippines',
          checkinQrToken,
        },
        select: { id: true, name: true, code: true, organizationId: true },
      });

      await tx.gymProfile.create({
        data: { gymId: gym.id },
      });

      await tx.gymSchedule.createMany({
        data: DEFAULT_SCHEDULES.map((s) => ({ gymId: gym.id, ...s })),
      });

      await tx.conversation.create({
        data: {
          gymId: gym.id,
          type: 'COMMUNITY',
          name: `${input.name} Community`,
          isDefault: true,
        },
      });

      return gym;
    });
  }

  async updateProfile(
    gymId: string,
    data: {
      description?: string;
      logoUrl?: string;
      coverPhotoUrl?: string;
      contactEmail?: string;
      contactPhone?: string;
      facebookUrl?: string;
      instagramUrl?: string;
      primaryColor?: string;
      secondaryColor?: string;
      accentColor?: string;
    },
  ) {
    return this.prisma.gymProfile.update({
      where: { gymId },
      data: { ...data, updatedAt: new Date() },
      select: {
        gymId: true,
        description: true,
        logoUrl: true,
        contactEmail: true,
        contactPhone: true,
        primaryColor: true,
        secondaryColor: true,
        accentColor: true,
      },
    });
  }

  async updateSchedules(
    gymId: string,
    schedules: Array<{
      dayOfWeek: number;
      openTime?: string | null;
      closeTime?: string | null;
      isClosed: boolean;
    }>,
  ) {
    // Upsert each schedule row individually — createMany with update is not supported
    // in all Prisma versions; upsert is safer here.
    await this.prisma.$transaction(
      schedules.map((s) =>
        this.prisma.gymSchedule.upsert({
          where: { gymId_dayOfWeek: { gymId, dayOfWeek: s.dayOfWeek } },
          create: { gymId, ...s },
          update: {
            openTime: s.openTime,
            closeTime: s.closeTime,
            isClosed: s.isClosed,
          },
        }),
      ),
    );
  }
}
