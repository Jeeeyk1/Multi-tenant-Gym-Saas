import { Logger } from '@nestjs/common';
import { CloseCycleUseCase } from './close-cycle.use-case';
import { BadgeRank } from '../../../../common/enums';
import type { BadgesRepository } from '../../infrastructure/persistence/badges.repository';
import type { BadgeNotifier } from '../badge-notifier';

const repo = {
  getLeaderboardExercises: jest.fn(),
  findBadgeCatalogByKey: jest.fn(),
  getTopMembersForExercise: jest.fn(),
  completeCycle: jest.fn(),
} as unknown as jest.Mocked<BadgesRepository>;
const notifier = { notify: jest.fn() } as unknown as jest.Mocked<BadgeNotifier>;

describe('CloseCycleUseCase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    repo.getLeaderboardExercises.mockResolvedValue([{ exercise: { id: 'squat', name: 'Back Squat' } }] as never);
    repo.findBadgeCatalogByKey.mockImplementation(((key: string) => Promise.resolve({ id: `cat-${key}` })) as never);
  });

  it('awards the top three and closes the cycle in one step, then notifies', async () => {
    repo.getTopMembersForExercise.mockResolvedValue([
      { memberId: 'm1', best1rm: 150 },
      { memberId: 'm2', best1rm: 140 },
    ]);
    repo.completeCycle.mockResolvedValue(true);

    await new CloseCycleUseCase(repo, notifier).execute('cycle-1', 'gym-1', new Date('2026-11-01'));

    const [cycleId, gymId, , awards] = repo.completeCycle.mock.calls[0];
    expect([cycleId, gymId]).toEqual(['cycle-1', 'gym-1']);
    expect(awards.map((a) => [a.memberId, a.rank, a.badgeCatalogId])).toEqual([
      ['m1', BadgeRank.GOLD, 'cat-CYCLE_GOLD'],
      ['m2', BadgeRank.SILVER, 'cat-CYCLE_SILVER'],
    ]);
    expect(notifier.notify).toHaveBeenCalledTimes(2);
  });

  it('does nothing more when the cycle was already closed by another run', async () => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    repo.getTopMembersForExercise.mockResolvedValue([{ memberId: 'm1', best1rm: 150 }]);
    repo.completeCycle.mockResolvedValue(false);

    await new CloseCycleUseCase(repo, notifier).execute('cycle-1', 'gym-1', new Date());
    expect(notifier.notify).not.toHaveBeenCalled();
  });

  it('notifies nobody when closing fails, so the retry starts clean', async () => {
    repo.getTopMembersForExercise.mockResolvedValue([{ memberId: 'm1', best1rm: 150 }]);
    repo.completeCycle.mockRejectedValue(new Error('db down'));

    await expect(new CloseCycleUseCase(repo, notifier).execute('cycle-1', 'gym-1', new Date())).rejects.toThrow('db down');
    expect(notifier.notify).not.toHaveBeenCalled();
  });
});
