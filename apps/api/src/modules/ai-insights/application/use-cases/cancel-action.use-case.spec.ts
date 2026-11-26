import { Logger } from '@nestjs/common';
import { CancelActionUseCase } from './cancel-action.use-case';
import type { PendingActionStore } from '../../infrastructure/persistence/pending-action.store';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

const store = { take: jest.fn() } as unknown as jest.Mocked<PendingActionStore>;
const caller: AuthenticatedUser = { type: 'gym', sub: 'staff-1', gymId: 'gym-1', roles: ['STAFF'], permissions: ['insights.query'] };

describe('CancelActionUseCase', () => {
  const useCase = () => new CancelActionUseCase(store);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  it("drops the caller's own action and logs it", async () => {
    store.take.mockResolvedValue({ id: 'act-1', action: 'suspend_member' } as never);
    await useCase().execute('gym-1', 'act-1', caller);
    expect(store.take).toHaveBeenCalledWith('gym-1', 'staff-1', 'act-1');
    expect(Logger.prototype.log).toHaveBeenCalledWith(expect.stringContaining('action cancelled id=act-1'));
  });

  it('is fine when there is nothing to cancel', async () => {
    store.take.mockResolvedValue(null);
    await expect(useCase().execute('gym-1', 'act-1', caller)).resolves.toBeUndefined();
  });

  it('refuses another gym before touching the store', async () => {
    await expect(useCase().execute('gym-2', 'act-1', caller)).rejects.toMatchObject({ statusCode: 403 });
    expect(store.take).not.toHaveBeenCalled();
  });
});
