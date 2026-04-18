import { RefreshTokenUseCase } from './refresh-token.use-case';
import { TokenInvalidError } from '../../domain/errors/token-invalid.error';
import type { JwtService } from '@nestjs/jwt';
import type { ConfigService } from '@nestjs/config';
import type { IdentityRepository } from '../../infrastructure/persistence/identity.repository';

const mockRepo = {
  hashToken: jest.fn().mockReturnValue('hashed'),
  findRefreshToken: jest.fn(),
  findOrgMember: jest.fn(),
  findGymStaffWithPermissions: jest.fn(),
  revokeRefreshTokenById: jest.fn().mockResolvedValue(undefined),
  generateRefreshTokenPair: jest.fn().mockReturnValue({ raw: 'new-raw', hash: 'new-hash' }),
  saveRefreshToken: jest.fn().mockResolvedValue(undefined),
} as unknown as IdentityRepository;

const mockJwt = { sign: jest.fn().mockReturnValue('new-access') } as unknown as JwtService;
const mockConfig = { getOrThrow: jest.fn().mockReturnValue('7d') } as unknown as ConfigService;

describe('RefreshTokenUseCase', () => {
  let useCase: RefreshTokenUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new RefreshTokenUseCase(mockRepo, mockJwt, mockConfig);
  });

  it('throws TokenInvalidError when token is not found', async () => {
    (mockRepo.findRefreshToken as jest.Mock).mockResolvedValue(null);

    await expect(useCase.execute('bad-token')).rejects.toThrow(TokenInvalidError);
  });

  it('rotates org refresh token and returns new tokens', async () => {
    (mockRepo.findRefreshToken as jest.Mock).mockResolvedValue({
      id: 'rt-1',
      userId: 'user-1',
      deviceInfo: { type: 'org', organizationId: 'org-1' },
    });
    (mockRepo.findOrgMember as jest.Mock).mockResolvedValue({ role: 'OWNER' });

    const result = await useCase.execute('valid-raw-token');

    expect(mockRepo.revokeRefreshTokenById).toHaveBeenCalledWith('rt-1');
    expect(result.accessToken).toBe('new-access');
    expect(result.refreshToken).toBe('new-raw');
  });

  it('rotates gym (staff) refresh token and returns new tokens', async () => {
    (mockRepo.findRefreshToken as jest.Mock).mockResolvedValue({
      id: 'rt-2',
      userId: 'user-2',
      deviceInfo: { type: 'gym', gymId: 'gym-1' },
    });
    (mockRepo.findGymStaffWithPermissions as jest.Mock).mockResolvedValue({
      id: 'staff-1',
      roles: [
        {
          role: {
            name: 'MANAGER',
            rolePermissions: [{ permission: { key: 'members.view' } }],
          },
        },
      ],
    });

    const result = await useCase.execute('valid-gym-token');

    expect(mockRepo.revokeRefreshTokenById).toHaveBeenCalledWith('rt-2');
    expect(mockJwt.sign).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'gym', gymId: 'gym-1', roles: ['MANAGER'] }),
    );
    expect(result.refreshToken).toBe('new-raw');
  });

  it('issues member JWT when user is not staff at that gym', async () => {
    (mockRepo.findRefreshToken as jest.Mock).mockResolvedValue({
      id: 'rt-3',
      userId: 'user-3',
      deviceInfo: { type: 'gym', gymId: 'gym-1' },
    });
    (mockRepo.findGymStaffWithPermissions as jest.Mock).mockResolvedValue(null);

    await useCase.execute('member-token');

    expect(mockJwt.sign).toHaveBeenCalledWith(
      expect.objectContaining({
        roles: ['MEMBER'],
        permissions: ['checkins.self', 'announcements.view'],
      }),
    );
  });

  it('throws TokenInvalidError when org member record no longer exists', async () => {
    (mockRepo.findRefreshToken as jest.Mock).mockResolvedValue({
      id: 'rt-4',
      userId: 'user-4',
      deviceInfo: { type: 'org', organizationId: 'org-1' },
    });
    (mockRepo.findOrgMember as jest.Mock).mockResolvedValue(null);

    await expect(useCase.execute('stale-token')).rejects.toThrow(TokenInvalidError);
  });
});
