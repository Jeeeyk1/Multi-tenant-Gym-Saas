import { Injectable } from '@nestjs/common';
import { ForbiddenError, NotFoundError } from '../../../../common/errors';
import { BadgesRepository } from '../../infrastructure/persistence/badges.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

export interface AwardCustomBadgeInput {
  memberId: string;
  customBadgeId: string;
  proofUrl?: string;
  proofNotes?: string;
}

@Injectable()
export class AwardCustomBadgeUseCase {
  constructor(private readonly repo: BadgesRepository) {}

  async execute(gymId: string, input: AwardCustomBadgeInput, caller: AuthenticatedUser) {
    assertGymAccess(caller, gymId);
    assertPermission(caller, 'badges.award');

    const member = await this.repo.findMemberInGym(gymId, input.memberId);
    if (!member) throw new NotFoundError('Member not found in this gym', 'MEMBER_NOT_FOUND');

    return this.repo.awardCustomBadge(
      input.memberId,
      gymId,
      input.customBadgeId,
      caller.sub,
      input.proofUrl,
      input.proofNotes,
    );
  }
}

function assertGymAccess(caller: AuthenticatedUser, gymId: string) {
  if (caller.type === 'gym' && caller.gymId !== gymId) {
    throw new ForbiddenError('Access denied to this gym', 'GYM_ACCESS_DENIED');
  }
}

function assertPermission(caller: AuthenticatedUser, permission: string) {
  if (caller.type === 'gym' && !caller.permissions.includes(permission)) {
    throw new ForbiddenError(`Missing permission: ${permission}`, 'PERMISSION_DENIED');
  }
}
