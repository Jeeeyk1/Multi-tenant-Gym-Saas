import { Injectable, Logger } from '@nestjs/common';
import { NotFoundError, ValidationError } from '../../../../common/errors';
import { assertGymAccess } from '../../../../common/auth/authorization';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { ChatSafetyRepository } from '../../infrastructure/persistence/chat-safety.repository';

/** The caller stops seeing someone's chat messages. One-way: the other person isn't told. */
@Injectable()
export class BlockUserUseCase {
  private readonly logger = new Logger(BlockUserUseCase.name);

  constructor(private readonly repo: ChatSafetyRepository) {}

  async execute(gymId: string, userId: string, caller: AuthenticatedUser) {
    assertGymAccess(caller, gymId);
    if (userId === caller.sub) throw new ValidationError("You can't block yourself", 'CANNOT_BLOCK_SELF');
    // Only people in this gym, so ids from elsewhere can't be probed.
    if (!(await this.repo.isPersonInGym(gymId, userId))) throw new NotFoundError('User not found', 'USER_NOT_FOUND');

    await this.repo.block(caller.sub, userId);
    this.logger.log(`user blocked gym=${gymId} blocker=${caller.sub} blocked=${userId}`);
    return { ok: true as const };
  }
}
