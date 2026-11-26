import { Injectable, Logger } from '@nestjs/common';
import { isUUID } from 'class-validator';
import { ValidationError } from '../../../../common/errors';
import { assertGymAccess } from '../../../../common/auth/authorization';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { ChatSafetyRepository } from '../../infrastructure/persistence/chat-safety.repository';

@Injectable()
export class UnblockUserUseCase {
  private readonly logger = new Logger(UnblockUserUseCase.name);

  constructor(private readonly repo: ChatSafetyRepository) {}

  async execute(gymId: string, userId: string, caller: AuthenticatedUser): Promise<void> {
    assertGymAccess(caller, gymId);
    if (!isUUID(userId, 'loose')) throw new ValidationError('userId must be an id', 'INVALID_USER_ID');
    await this.repo.unblock(caller.sub, userId);
    this.logger.log(`user unblocked gym=${gymId} blocker=${caller.sub} blocked=${userId}`);
  }
}
