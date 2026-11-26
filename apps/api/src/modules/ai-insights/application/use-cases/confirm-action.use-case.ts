import { Injectable, Logger } from '@nestjs/common';
import { NotFoundError } from '../../../../common/errors';
import { assertGymAccess, assertPermission } from '../../../../common/auth/authorization';
import { Permission } from '../../../../common/enums';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { ActionTools } from '../tools/action-tools';
import { PendingActionStore } from '../../infrastructure/persistence/pending-action.store';

export interface ConfirmActionResult {
  ok: true;
  message: string;
}

const NOT_FOUND = 'This action has expired or was already handled. Ask the assistant again.';

/** Runs an action the assistant proposed, once, for the person it was proposed to. No AI call. */
@Injectable()
export class ConfirmActionUseCase {
  private readonly logger = new Logger(ConfirmActionUseCase.name);

  constructor(
    private readonly store: PendingActionStore,
    private readonly actions: ActionTools,
  ) {}

  async execute(gymId: string, actionId: string, caller: AuthenticatedUser): Promise<ConfirmActionResult> {
    assertGymAccess(caller, gymId);
    assertPermission(caller, Permission.INSIGHTS_QUERY);

    // Taken before it runs: a double-click or retry finds nothing instead of running it twice.
    const pending = await this.store.take(gymId, caller.sub, actionId);
    if (!pending) throw new NotFoundError(NOT_FOUND, 'ACTION_NOT_FOUND');

    try {
      await this.actions.run(pending, caller);
    } catch (err) {
      this.logger.warn(
        `action failed id=${pending.id} gym=${gymId} user=${caller.sub} action=${pending.action}: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw err;
    }
    this.logger.log(`action confirmed id=${pending.id} gym=${gymId} user=${caller.sub} action=${pending.action}`);
    return { ok: true, message: pending.doneMessage };
  }
}
