import { Injectable } from '@nestjs/common';
import { ConflictError, ForbiddenError, NotFoundError } from '../../../../common/errors';
import { CheckInsRepository } from '../../infrastructure/persistence/check-ins.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { assertGymAccess, hasPermission } from '../../../../common/auth/authorization';
import { Permission } from '../../../../common/enums';

@Injectable()
export class CheckoutUseCase {
  constructor(private readonly repo: CheckInsRepository) {}

  async execute(gymId: string, checkinId: string, caller: AuthenticatedUser) {
    assertGymAccess(caller, gymId);

    const checkin = await this.repo.findCheckinById(checkinId, gymId);
    if (!checkin) {
      throw new NotFoundError('Check-in not found', 'CHECKIN_NOT_FOUND');
    }

    if (checkin.checkedOutAt !== null) {
      throw new ConflictError('Check-in is already closed', 'ALREADY_CHECKED_OUT');
    }

    // Staff with checkins.manage can check out any member.
    // A member can check out their own active check-in.
    if (caller.type === 'gym') {
      const hasManage = hasPermission(caller, Permission.CHECKINS_MANAGE);
      if (!hasManage) {
        // Check if this is the member's own check-in
        const member = await this.repo.findMemberByUserId(caller.sub, gymId);
        if (!member || member.id !== checkin.memberId) {
          throw new ForbiddenError('Missing permission: checkins.manage', 'PERMISSION_DENIED');
        }
      }
    }

    return this.repo.closeCheckin(checkinId, false);
  }
}
