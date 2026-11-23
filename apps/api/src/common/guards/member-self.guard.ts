import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenError, NotFoundError } from '../errors';
import type { AuthenticatedUser } from '../types/auth.types';

/**
 * Guards routes shaped `/gyms/:gymId/members/:memberId/...` that only the member
 * themself may use, such as their health-derived fitness plan. Staff, org and
 * admin tokens are refused. Must run after JwtAuthGuard.
 */
@Injectable()
export class MemberSelfGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const { gymId, memberId } = request.params;
    const user = request.user as AuthenticatedUser | undefined;
    if (!user || !gymId || !memberId || user.type !== 'gym') {
      throw new ForbiddenError('Access denied', 'MEMBER_ACCESS_DENIED');
    }

    const member = await this.prisma.gymMember.findFirst({
      where: { id: memberId, gymId },
      select: { userId: true },
    });
    if (!member) throw new NotFoundError('Member not found', 'MEMBER_NOT_FOUND');
    if (member.userId !== user.sub) {
      throw new ForbiddenError('Access denied', 'MEMBER_ACCESS_DENIED');
    }
    return true;
  }
}
