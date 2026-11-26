import { Injectable } from '@nestjs/common';
import { LeaderboardRepository } from '../../infrastructure/persistence/leaderboard.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { assertGymAccess, assertPermission } from '../../../../common/auth/authorization';
import { Permission } from '../../../../common/enums';
import { withoutMemberDetails } from '../../../../common/auth/member-details';

@Injectable()
export class ListPendingSubmissionsUseCase {
  constructor(private readonly repo: LeaderboardRepository) {}

  async execute(gymId: string, caller: AuthenticatedUser) {
    assertGymAccess(caller, gymId);
    assertPermission(caller, Permission.LEADERBOARD_REVIEW);
    return withoutMemberDetails(await this.repo.listPendingSubmissions(gymId), caller);
  }
}
