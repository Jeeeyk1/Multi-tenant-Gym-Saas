import { LogoutUseCase } from './logout.use-case';
import type { IdentityRepository } from '../../infrastructure/persistence/identity.repository';

const mockRepo = {
  hashToken: jest.fn().mockReturnValue('hashed'),
  revokeRefreshToken: jest.fn().mockResolvedValue(undefined),
} as unknown as IdentityRepository;

describe('LogoutUseCase', () => {
  let useCase: LogoutUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new LogoutUseCase(mockRepo);
  });

  it('revokes the refresh token', async () => {
    await useCase.execute('raw-token');
    expect(mockRepo.hashToken).toHaveBeenCalledWith('raw-token');
    expect(mockRepo.revokeRefreshToken).toHaveBeenCalledWith('hashed');
  });

  it('does not throw when token does not exist (idempotent)', async () => {
    (mockRepo.revokeRefreshToken as jest.Mock).mockResolvedValue(undefined);
    await expect(useCase.execute('nonexistent')).resolves.toBeUndefined();
  });
});
