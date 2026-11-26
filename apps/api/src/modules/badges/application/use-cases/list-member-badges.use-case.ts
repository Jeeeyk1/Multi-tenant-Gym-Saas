import { Injectable } from '@nestjs/common';
import { ForbiddenError, NotFoundError } from '../../../../common/errors';
import { BadgesRepository } from '../../infrastructure/persistence/badges.repository';
import { BadgeRarityService } from '../badge-rarity.service';
import { badgeKey } from '../../domain/badge-rarity';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { assertGymAccess, hasPermission } from '../../../../common/auth/authorization';
import { Permission } from '../../../../common/enums';

@Injectable()
export class ListMemberBadgesUseCase {
  constructor(
    private readonly repo: BadgesRepository,
    private readonly rarity: BadgeRarityService,
  ) {}

  async execute(gymId: string, targetMemberId: string, caller: AuthenticatedUser) {
    assertGymAccess(caller, gymId);

    // Members can only see their own badges
    if (caller.type === 'gym') {
      const myMember = await this.repo.findMemberByUserId(gymId, caller.sub);
      if (!myMember) throw new NotFoundError('Member not found', 'MEMBER_NOT_FOUND');

      const canViewOthers = hasPermission(caller, Permission.MEMBERS_VIEW);
      if (!canViewOthers && myMember.id !== targetMemberId) {
        throw new ForbiddenError('Cannot view another member\'s badges', 'FORBIDDEN');
      }
    }

    const member = await this.repo.findMemberInGym(gymId, targetMemberId);
    if (!member) throw new NotFoundError('Member not found in this gym', 'MEMBER_NOT_FOUND');

    return this.withRarity(gymId, await this.repo.listMemberBadges(targetMemberId, gymId));
  }

  async executeForSelf(gymId: string, caller: AuthenticatedUser) {
    assertGymAccess(caller, gymId);
    if (caller.type !== 'gym') throw new ForbiddenError('Only gym members can access this', 'FORBIDDEN');

    const member = await this.repo.findMemberByUserId(gymId, caller.sub);
    if (!member) throw new NotFoundError('Member not found', 'MEMBER_NOT_FOUND');

    return this.withRarity(gymId, await this.repo.listMemberBadges(member.id, gymId));
  }

  private async withRarity<T extends Parameters<typeof badgeKey>[0]>(gymId: string, rows: T[]) {
    const rarityOf = await this.rarity.lookup(gymId);
    return rows.map((r) => ({ ...r, rarity: rarityOf(badgeKey(r)).rarity }));
  }
}
