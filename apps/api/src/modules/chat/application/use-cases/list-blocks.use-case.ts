import { Injectable } from '@nestjs/common';
import { assertGymAccess } from '../../../../common/auth/authorization';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { ChatSafetyRepository } from '../../infrastructure/persistence/chat-safety.repository';

/** The people the caller blocked, for the "Blocked people" screen and to hide their live messages. */
@Injectable()
export class ListBlocksUseCase {
  constructor(private readonly repo: ChatSafetyRepository) {}

  async execute(gymId: string, caller: AuthenticatedUser) {
    assertGymAccess(caller, gymId);
    const rows = await this.repo.listBlocks(caller.sub);
    return rows.map((row) => ({ userId: row.blocked.id, fullName: row.blocked.fullName, blockedAt: row.createdAt }));
  }
}
