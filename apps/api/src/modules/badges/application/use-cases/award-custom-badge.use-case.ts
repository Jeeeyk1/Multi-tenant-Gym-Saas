import { Injectable } from '@nestjs/common';
import { ForbiddenError, NotFoundError } from '../../../../common/errors';
import { BadgesRepository } from '../../infrastructure/persistence/badges.repository';
import { BadgeNotifier } from '../badge-notifier';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

export interface AwardCustomBadgeInput {
  memberId: string;
  customBadgeId: string;
  proofUrl?: string;
  proofNotes?: string;
}

@Injectable()
export class AwardCustomBadgeUseCase {
  constructor(
    private readonly repo: BadgesRepository,
    private readonly notifier: BadgeNotifier,
  ) {}

  async execute(gymId: string, input: AwardCustomBadgeInput, caller: AuthenticatedUser) {
    assertGymAccess(caller, gymId);
    assertPermission(caller, 'badges.award');

    const member = await this.repo.findMemberInGym(gymId, input.memberId);
    if (!member) throw new NotFoundError('Member not found in this gym', 'MEMBER_NOT_FOUND');

    // The badge must be one of this gym's own custom badges.
    const badge = await this.repo.findCustomBadge(gymId, input.customBadgeId);
    if (!badge) throw new NotFoundError('Badge not found in this gym', 'BADGE_NOT_FOUND');

    const awarded = await this.repo.awardCustomBadge(
      input.memberId,
      gymId,
      badge,
      caller.sub,
      input.proofUrl,
      input.proofNotes,
    );
    void this.notifier.notify(input.memberId, [badge.name]);
    return awarded;
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
