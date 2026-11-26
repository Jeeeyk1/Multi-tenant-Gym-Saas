import { Injectable, Logger } from '@nestjs/common';
import { NotFoundError } from '../../../../common/errors';
import { BadgesRepository } from '../../infrastructure/persistence/badges.repository';
import { BadgeNotifier } from '../badge-notifier';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { assertGymAccess, assertPermission } from '../../../../common/auth/authorization';
import { Permission } from '../../../../common/enums';

export interface AwardCustomBadgeInput {
  memberId: string;
  customBadgeId: string;
  proofUrl?: string;
  proofNotes?: string;
}

@Injectable()
export class AwardCustomBadgeUseCase {
  private readonly logger = new Logger(AwardCustomBadgeUseCase.name);

  constructor(
    private readonly repo: BadgesRepository,
    private readonly notifier: BadgeNotifier,
  ) {}

  async execute(gymId: string, input: AwardCustomBadgeInput, caller: AuthenticatedUser) {
    assertGymAccess(caller, gymId);
    assertPermission(caller, Permission.BADGES_AWARD);

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
    this.logger.log(`badge awarded gym=${gymId} member=${input.memberId} source=STAFF_AWARD custom=${badge.id} by=${caller.sub}`);
    void this.notifier.notify(input.memberId, [badge.name]);
    return awarded;
  }
}
