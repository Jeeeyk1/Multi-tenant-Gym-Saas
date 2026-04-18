import { ActivateAccountUseCase } from './activate-account.use-case';
import { TokenInvalidError } from '../../domain/errors/token-invalid.error';
import type { IdentityRepository } from '../../infrastructure/persistence/identity.repository';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

const mockRepo = {
  findInviteToken: jest.fn(),
  activateAccount: jest.fn().mockResolvedValue(undefined),
} as unknown as IdentityRepository;

describe('ActivateAccountUseCase', () => {
  let useCase: ActivateAccountUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new ActivateAccountUseCase(mockRepo);
  });

  it('activates the account when token is valid', async () => {
    (mockRepo.findInviteToken as jest.Mock).mockResolvedValue({
      id: 'token-1',
      userId: 'user-1',
    });
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

    await useCase.execute('valid-invite-token', 'NewPassword1!');

    expect(bcrypt.hash).toHaveBeenCalledWith('NewPassword1!', 12);
    expect(mockRepo.activateAccount).toHaveBeenCalledWith(
      'user-1',
      'hashed-password',
      'token-1',
    );
  });

  it('throws TokenInvalidError when invite token is not found', async () => {
    (mockRepo.findInviteToken as jest.Mock).mockResolvedValue(null);

    await expect(useCase.execute('bad-token', 'password')).rejects.toThrow(
      TokenInvalidError,
    );
  });

  it('throws TokenInvalidError when token is expired or used (repo returns null)', async () => {
    (mockRepo.findInviteToken as jest.Mock).mockResolvedValue(null);

    await expect(useCase.execute('expired-token', 'password')).rejects.toThrow(
      TokenInvalidError,
    );
  });
});
