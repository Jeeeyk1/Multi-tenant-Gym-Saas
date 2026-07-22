import { BulkInviteMembersUseCase } from './bulk-invite-members.use-case';
import type { MembersRepository } from '../../infrastructure/persistence/members.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

const caller: AuthenticatedUser = {
  sub: 'u1',
  type: 'gym',
  gymId: 'gym-1',
  roles: [],
  permissions: ['members.create'],
};

describe('BulkInviteMembersUseCase', () => {
  const repo = {
    findGymById: jest.fn(),
    bulkCreateMemberWithOutbox: jest.fn(),
  } as unknown as jest.Mocked<MembersRepository>;
  let useCase: BulkInviteMembersUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new BulkInviteMembersUseCase(repo);
    repo.findGymById.mockResolvedValue({ id: 'gym-1', name: 'Iron', code: 'IRON' } as never);
    repo.bulkCreateMemberWithOutbox.mockResolvedValue(undefined);
  });

  it('creates valid rows and skips invalid/duplicate ones', async () => {
    const result = await useCase.execute(
      'gym-1',
      [
        { email: 'a@example.com', fullName: 'A', expiryDate: '2026-12-31' },
        { email: 'bad', fullName: 'B', expiryDate: '2026-12-31' },
        { email: 'c@example.com', fullName: '', expiryDate: '2026-12-31' },
        { email: 'd@example.com', fullName: 'D', expiryDate: 'nope' },
        { email: 'a@example.com', fullName: 'A2', expiryDate: '2026-12-31' }, // dup
      ],
      caller,
    );

    expect(result.created).toBe(1);
    expect(repo.bulkCreateMemberWithOutbox).toHaveBeenCalledTimes(1);
    expect(result.skipped).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ email: 'bad', reason: 'Invalid email' }),
        expect.objectContaining({ email: 'c@example.com', reason: 'Missing name' }),
        expect.objectContaining({ email: 'd@example.com', reason: 'Invalid expiry date' }),
        expect.objectContaining({ email: 'a@example.com', reason: 'Duplicate in request' }),
      ]),
    );
  });

  it('skips (does not abort) a row whose create fails, e.g. email taken mid-batch', async () => {
    repo.bulkCreateMemberWithOutbox
      .mockRejectedValueOnce(new Error('unique constraint'))
      .mockResolvedValueOnce(undefined);

    const result = await useCase.execute(
      'gym-1',
      [
        { email: 'taken@example.com', fullName: 'T', expiryDate: '2026-12-31' },
        { email: 'ok@example.com', fullName: 'O', expiryDate: '2026-12-31' },
      ],
      caller,
    );

    expect(result.created).toBe(1);
    expect(result.skipped).toEqual([{ email: 'taken@example.com', reason: 'Already registered' }]);
  });
});
