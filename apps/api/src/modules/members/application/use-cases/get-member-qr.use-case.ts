import { Injectable } from '@nestjs/common';
import { ForbiddenError, NotFoundError } from '../../../../common/errors';
import { MembersRepository } from '../../infrastructure/persistence/members.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { assertGymAccess, hasPermission } from '../../../../common/auth/authorization';
import { Permission } from '../../../../common/enums';

@Injectable()
export class GetMemberQrUseCase {
  constructor(private readonly repo: MembersRepository) {}

  async execute(gymId: string, memberId: string, caller: AuthenticatedUser) {
    assertGymAccess(caller, gymId);

    const member = await this.repo.findMemberById(memberId, gymId);
    if (!member) {
      throw new NotFoundError('Member not found', 'MEMBER_NOT_FOUND');
    }

    // Staff with members.view can access any member's QR.
    // A gym-level member can access their own QR only.
    if (caller.type === 'gym') {
      const isOwnRecord = member.user.id === caller.sub;
      const hasStaffAccess = hasPermission(caller, Permission.MEMBERS_VIEW);
      if (!isOwnRecord && !hasStaffAccess) {
        throw new ForbiddenError('Missing permission: members.view', 'PERMISSION_DENIED');
      }
    }

    return { qrCodeToken: member.qrCodeToken };
  }
}
