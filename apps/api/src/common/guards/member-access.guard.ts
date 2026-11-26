import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenError, NotFoundError } from '../errors';
import type { AuthenticatedUser } from '../types/auth.types';
import { Permission } from '../enums';

const READ_PERMISSION = Permission.MEMBERS_DETAILS;
const WRITE_PERMISSION = Permission.MEMBERS_EDIT;

/**
 * Guards routes shaped `/gyms/:gymId/members/:memberId/...`. Must run after
 * JwtAuthGuard (it reads `request.user`).
 *
 * 1. The member must belong to `:gymId` — otherwise 404, so a member id from
 *    another gym can never be acted on through the caller's own gym.
 * 2. A gym-token caller must either be that member, or be staff holding
 *    `members.details` (GET) / `members.edit` (anything else).
 *
 * Org and system-admin tokens pass: GymAccessGuard has already confirmed they
 * may act on `:gymId`.
 */
@Injectable()
export class MemberAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const { gymId, memberId } = request.params;
    const user = request.user as AuthenticatedUser | undefined;
    if (!user || !gymId || !memberId) {
      throw new ForbiddenError('Access denied', 'MEMBER_ACCESS_DENIED');
    }

    const member = await this.prisma.gymMember.findFirst({
      where: { id: memberId, gymId },
      select: { userId: true },
    });
    if (!member) throw new NotFoundError('Member not found', 'MEMBER_NOT_FOUND');

    if (user.type !== 'gym') return true;
    if (member.userId === user.sub) return true;

    const required = request.method === 'GET' ? READ_PERMISSION : WRITE_PERMISSION;
    if (!user.permissions?.includes(required)) {
      throw new ForbiddenError('Access denied', 'MEMBER_ACCESS_DENIED');
    }
    return true;
  }
}
