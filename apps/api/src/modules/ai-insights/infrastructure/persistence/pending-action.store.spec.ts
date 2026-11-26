import { PendingActionStore } from './pending-action.store';
import type { RedisService } from '../../../../common/redis/redis.service';
import type { PendingAction } from '../../domain/pending-action';
import { AssistantAction } from '../../../../common/enums';

const client = { set: jest.fn(), getdel: jest.fn() };
const redis = { getClient: () => client } as unknown as RedisService;
const pending: PendingAction = {
  id: 'act-1',
  gymId: 'gym-1',
  userId: 'staff-1',
  action: AssistantAction.SUSPEND_MEMBER,
  input: { memberId: 'm-1' },
  summary: 'Suspend Juan Cruz (MBR-0001).',
  confirmLabel: 'Suspend',
  doneMessage: 'Suspended Juan Cruz.',
  expiresAt: '2026-11-27T10:10:00.000Z',
};

describe('PendingActionStore', () => {
  const store = () => new PendingActionStore(redis);

  beforeEach(() => jest.clearAllMocks());

  it('saves under the gym and person, for 10 minutes', async () => {
    await store().save(pending);
    expect(client.set).toHaveBeenCalledWith('insights:action:gym-1:staff-1:act-1', JSON.stringify(pending), 'EX', 600);
  });

  it("takes with GETDEL, so it's single use and only found under the same gym and person", async () => {
    client.getdel.mockResolvedValueOnce(JSON.stringify(pending));
    await expect(store().take('gym-1', 'staff-1', 'act-1')).resolves.toEqual(pending);
    expect(client.getdel).toHaveBeenCalledWith('insights:action:gym-1:staff-1:act-1');

    await store().take('gym-1', 'someone-else', 'act-1');
    expect(client.getdel).toHaveBeenLastCalledWith('insights:action:gym-1:someone-else:act-1');
  });

  it('returns null when nothing is stored', async () => {
    client.getdel.mockResolvedValueOnce(null);
    await expect(store().take('gym-1', 'staff-1', 'act-1')).resolves.toBeNull();
  });

  it('lets a Redis failure through instead of pretending it worked', async () => {
    client.set.mockRejectedValueOnce(new Error('redis down'));
    await expect(store().save(pending)).rejects.toThrow('redis down');
  });
});
