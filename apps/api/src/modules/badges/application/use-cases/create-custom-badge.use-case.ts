import { Injectable } from '@nestjs/common';
import { BadgeCategory, Permission } from '../../../../common/enums';
import { BadgesRepository } from '../../infrastructure/persistence/badges.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { assertGymAccess, assertPermission } from '../../../../common/auth/authorization';

export interface CreateCustomBadgeInput {
  name: string;
  description?: string;
  icon: string;
  color: string;
  category?: BadgeCategory;
}

@Injectable()
export class CreateCustomBadgeUseCase {
  constructor(private readonly repo: BadgesRepository) {}

  async execute(gymId: string, input: CreateCustomBadgeInput, caller: AuthenticatedUser) {
    assertGymAccess(caller, gymId);
    assertPermission(caller, Permission.BADGES_MANAGE);

    return this.repo.createCustomBadge(gymId, {
      ...input,
      category: input.category ?? BadgeCategory.LOYALTY,
      createdByUserId: caller.sub,
    });
  }
}
