import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../../../common/prisma/prisma.service';

@Injectable()
export class OrganizationRepository {
  constructor(private readonly prisma: PrismaService) {}

  findBySlug(slug: string) {
    return this.prisma.organization.findUnique({
      where: { slug: slug.toLowerCase() },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        createdAt: true,
        _count: { select: { gyms: true } },
      },
    });
  }

  findUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true },
    });
  }

  /**
   * Creates an organization, its owner user account, org membership, and invite token
   * in a single transaction.
   *
   * Returns the invite token (raw string) so the caller can relay it to the owner.
   * In production this would be emailed. In dev it is returned in the response.
   */
  async createWithOwner(input: {
    name: string;
    slug: string;
    ownerEmail: string;
    ownerFullName: string;
  }): Promise<{ organizationId: string; inviteToken: string }> {
    const inviteToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    const result = await this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: input.name,
          slug: input.slug.toLowerCase(),
        },
        select: { id: true },
      });

      const user = await tx.user.create({
        data: {
          email: input.ownerEmail.toLowerCase(),
          fullName: input.ownerFullName,
        },
        select: { id: true },
      });

      await tx.organizationMember.create({
        data: {
          organizationId: org.id,
          userId: user.id,
          role: 'OWNER',
        },
      });

      await tx.userToken.create({
        data: {
          userId: user.id,
          token: inviteToken,
          type: 'INVITE',
          expiresAt,
        },
      });

      return { organizationId: org.id, userId: user.id };
    });

    return { organizationId: result.organizationId, inviteToken };
  }
}
