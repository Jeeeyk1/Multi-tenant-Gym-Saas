import { Logger } from '@nestjs/common';
import { ConfirmActionUseCase } from './confirm-action.use-case';
import type { ActionTools } from '../tools/action-tools';
import type { PendingActionStore } from '../../infrastructure/persistence/pending-action.store';
import type { PendingAction } from '../../domain/pending-action';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { AssistantAction } from '../../../../common/enums';
import { NotFoundError } from '../../../../common/errors';

const store = { take: jest.fn(), save: jest.fn() } as unknown as jest.Mocked<PendingActionStore>;
const actions = { run: jest.fn() } as unknown as jest.Mocked<ActionTools>;
const caller: AuthenticatedUser = { type: 'gym', sub: 'staff-1', gymId: 'gym-1', roles: ['STAFF'], permissions: ['insights.query'] };
const pending: PendingAction = {
  id: 'a1b2c3d4-0000-4000-8000-000000000001',
  gymId: 'gym-1',
  userId: 'staff-1',
  action: AssistantAction.SUSPEND_MEMBER,
  input: { memberId: 'm-1' },
  summary: 'Suspend Juan Cruz (MBR-0001).',
  confirmLabel: 'Suspend',
  doneMessage: 'Suspended Juan Cruz.',
  expiresAt: '2026-11-27T10:10:00.000Z',
};

describe('ConfirmActionUseCase', () => {
  const useCase = () => new ConfirmActionUseCase(store, actions);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  it("takes the caller's own action and runs it", async () => {
    store.take.mockResolvedValue(pending);
    await expect(useCase().execute('gym-1', pending.id, caller)).resolves.toEqual({ ok: true, message: 'Suspended Juan Cruz.' });
    expect(store.take).toHaveBeenCalledWith('gym-1', 'staff-1', pending.id);
    expect(actions.run).toHaveBeenCalledWith(pending, caller);
  });

  it('returns ACTION_NOT_FOUND for an expired, handled or someone else’s action', async () => {
    store.take.mockResolvedValue(null);
    await expect(useCase().execute('gym-1', pending.id, caller)).rejects.toMatchObject({ code: 'ACTION_NOT_FOUND' });
    await expect(useCase().execute('gym-1', pending.id, caller)).rejects.toBeInstanceOf(NotFoundError);
    expect(actions.run).not.toHaveBeenCalled();
  });

  it('passes on a failure from the use case and logs it', async () => {
    store.take.mockResolvedValue(pending);
    actions.run.mockRejectedValue(new Error('Member is already suspended'));
    await expect(useCase().execute('gym-1', pending.id, caller)).rejects.toThrow('already suspended');
    expect(Logger.prototype.warn).toHaveBeenCalledWith(expect.stringContaining('action failed'));
  });

  it('refuses another gym before touching the store', async () => {
    await expect(useCase().execute('gym-2', pending.id, caller)).rejects.toMatchObject({ statusCode: 403 });
    expect(store.take).not.toHaveBeenCalled();
  });
});
