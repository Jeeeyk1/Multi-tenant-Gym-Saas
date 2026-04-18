import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../../../common/prisma/prisma.service';

export interface RefreshTokenContext {
  type: 'org' | 'gym';
  organizationId?: string;
  gymId?: string;
}

@Injectable()
export class IdentityRepository {
  constructor(private readonly prisma: PrismaService) {}

  findOrgBySlug(slug: string) {
    return this.prisma.organization.findFirst({
      where: { slug: slug.toLowerCase(), status: 'ACTIVE' },
      select: { id: true, name: true, slug: true },
    });
  }

  findGymByCode(code: string) {
    return this.prisma.gym.findFirst({
      where: { code: code.toUpperCase(), status: 'ACTIVE' },
      select: { id: true, name: true, code: true },
    });
  }

  findUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        fullName: true,
        passwordHash: true,
        isActive: true,
        emailVerifiedAt: true,
      },
    });
  }

  findOrgMember(userId: string, organizationId: string) {
    return this.prisma.organizationMember.findFirst({
      where: { userId, organizationId },
      select: { role: true },
    });
  }

  /**
   * Find an active gym staff record with all their assigned roles and permissions.
   * Returns null if user is not an active staff member at this gym.
   */
  findGymStaffWithPermissions(userId: string, gymId: string) {
    return this.prisma.gymStaff.findFirst({
      where: { userId, gymId, isActive: true },
      select: {
        id: true,
        roles: {
          select: {
            role: {
              select: {
                name: true,
                rolePermissions: {
                  select: {
                    permission: {
                      select: { key: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  findGymMember(userId: string, gymId: string) {
    return this.prisma.gymMember.findFirst({
      where: { userId, gymId },
      select: { id: true },
    });
  }

  /**
   * Generate a cryptographically random refresh token string.
   * Returns both the raw token (sent to client) and the hash (stored in DB).
   */
  generateRefreshTokenPair(): { raw: string; hash: string } {
    const raw = randomBytes(48).toString('hex');
    const hash = createHash('sha256').update(raw).digest('hex');
    return { raw, hash };
  }

  hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  async saveRefreshToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
    context: RefreshTokenContext,
  ): Promise<void> {
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
        deviceInfo: context as object,
      },
    });
  }

  findRefreshToken(tokenHash: string) {
    return this.prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        userId: true,
        deviceInfo: true,
      },
    });
  }

  async revokeRefreshToken(tokenHash: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { isRevoked: true },
    });
  }

  async revokeRefreshTokenById(id: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { id },
      data: { isRevoked: true },
    });
  }

  findInviteToken(token: string) {
    return this.prisma.userToken.findFirst({
      where: {
        token,
        type: 'INVITE',
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      select: { id: true, userId: true },
    });
  }

  async activateAccount(
    userId: string,
    passwordHash: string,
    tokenId: string,
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash,
          emailVerifiedAt: new Date(),
          updatedAt: new Date(),
        },
      }),
      this.prisma.userToken.update({
        where: { id: tokenId },
        data: { isUsed: true },
      }),
    ]);
  }

  findUserById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, fullName: true },
    });
  }
}
