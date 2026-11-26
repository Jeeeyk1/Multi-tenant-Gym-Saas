import { Injectable, Logger } from '@nestjs/common';
import { assertGymAccess } from '../../../../common/auth/authorization';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { PendingActionStore } from '../../infrastructure/persistence/pending-action.store';

/** Drops a proposed action. Already expired or handled is fine (nothing to cancel). */
@Injectable()
export class CancelActionUseCase {
  private readonly logger = new Logger(CancelActionUseCase.name);

  constructor(private readonly store: PendingActionStore) {}

  async execute(gymId: string, actionId: string, caller: AuthenticatedUser): Promise<void> {
    assertGymAccess(caller, gymId);
    const pending = await this.store.take(gymId, caller.sub, actionId);
    if (pending) this.logger.log(`action cancelled id=${pending.id} gym=${gymId} user=${caller.sub} action=${pending.action}`);
  }
}
