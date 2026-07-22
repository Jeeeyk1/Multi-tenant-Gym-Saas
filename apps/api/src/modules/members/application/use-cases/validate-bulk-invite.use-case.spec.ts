import { ValidateBulkInviteUseCase } from './validate-bulk-invite.use-case';
import type { MembersRepository } from '../../infrastructure/persistence/members.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

const caller: AuthenticatedUser = {
  sub: 'u1',
  type: 'gym',
  gymId: 'gym-1',
  roles: [],
  permissions: ['members.create'],
};

const CSV = [
  'Name,Email,Expiry Date',
  'Juan,juan@example.com,2026-12-31',
  ',noname@example.com,2026-12-31',
  'Bad,not-an-email,2026-12-31',
  'Maria,maria@example.com,',
  'Juan Again,juan@example.com,2026-12-31',
  'Existing,exists@example.com,2026-12-31',
].join('\n');

describe('ValidateBulkInviteUseCase', () => {
  const repo = { findExistingEmails: jest.fn() } as unknown as jest.Mocked<MembersRepository>;
  let useCase: ValidateBulkInviteUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new ValidateBulkInviteUseCase(repo);
    repo.findExistingEmails.mockResolvedValue(new Set(['exists@example.com']));
  });

  it('classifies each row: ready / invalid / duplicate / already-registered', async () => {
    const { rows, summary } = await useCase.execute('gym-1', Buffer.from(CSV), caller);

    const byEmail = (email: string, occurrence = 0) => rows.filter((r) => r.email === email)[occurrence];

    expect(byEmail('juan@example.com', 0).status).toBe('ready');
    expect(byEmail('noname@example.com').status).toBe('invalid'); // missing name
    expect(byEmail('not-an-email').status).toBe('invalid'); // bad email
    expect(byEmail('maria@example.com').status).toBe('invalid'); // missing expiry
    expect(byEmail('juan@example.com', 1).status).toBe('duplicate_in_file');
    expect(byEmail('exists@example.com').status).toBe('already_registered');

    expect(summary.total).toBe(6);
    expect(summary.ready).toBe(1);
    expect(summary.invalid).toBe(3);
    expect(summary.skipped).toBe(2); // one duplicate + one already-registered
  });

  it('denies a caller without members.create', async () => {
    const noPerm = { ...caller, permissions: [] };
    await expect(useCase.execute('gym-1', Buffer.from(CSV), noPerm)).rejects.toThrow(/permission/i);
  });
});
