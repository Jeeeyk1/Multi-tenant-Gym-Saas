import { Injectable } from '@nestjs/common';
import { MembersRepository } from '../../infrastructure/persistence/members.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { assertGymAccess, assertPermission } from '../../../../common/auth/authorization';
import { Permission } from '../../../../common/enums';
import { visibleMember } from '../../domain/member-visibility';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

@Injectable()
export class ListMembersUseCase {
  constructor(private readonly repo: MembersRepository) {}

  async execute(
    gymId: string,
    query: { page?: number; limit?: number },
    caller: AuthenticatedUser,
  ) {
    assertGymAccess(caller, gymId);
    assertPermission(caller, Permission.MEMBERS_VIEW);

    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, query.limit ?? DEFAULT_LIMIT));
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.repo.listMembers(gymId, skip, limit),
      this.repo.countMembers(gymId),
    ]);

    return {
      data: data.map((member) => visibleMember(member, caller)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
