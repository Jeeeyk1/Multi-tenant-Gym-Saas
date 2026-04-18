import { GymLoginUseCase } from './gym-login.use-case';
import { InvalidCredentialsError } from '../../domain/errors/invalid-credentials.error';
import type { JwtService } from '@nestjs/jwt';
import type { ConfigService } from '@nestjs/config';
import type { IdentityRepository } from '../../infrastructure/persistence/identity.repository';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

const mockRepo = {
  findGymByCode: jest.fn(),
  findUserByEmail: jest.fn(),
  findGymStaffWithPermissions: jest.fn(),
  findGymMember: jest.fn(),
  generateRefreshTokenPair: jest.fn().mockReturnValue({ raw: 'raw-token', hash: 'hash' }),
  saveRefreshToken: jest.fn().mockResolvedValue(undefined),
} as unknown as IdentityRepository;

const mockJwt = { sign: jest.fn().mockReturnValue('access-token') } as unknown as JwtService;
const mockConfig = { getOrThrow: jest.fn().mockReturnValue('7d') } as unknown as ConfigService;

const validGym = { id: 'gym-1', name: 'Fitlife Manila', code: 'FITMNL' };
const validUser = {
  id: 'user-1',
  email: 'staff@gym.com',
  fullName: 'Staff',
  passwordHash: 'hashed',
  isActive: true,
  emailVerifiedAt: new Date(),
};
const staffRecord = {
  id: 'staff-1',
  roles: [
    {
      role: {
        name: 'MANAGER',
        rolePermissions: [
          { permission: { key: 'members.view' } },
          { permission: { key: 'members.create' } },
        ],
      },
    },
  ],
};

describe('GymLoginUseCase', () => {
  let useCase: GymLoginUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new GymLoginUseCase(mockRepo, mockJwt, mockConfig);
  });

  it('returns staff JWT with permissions union on valid staff login', async () => {
    (mockRepo.findGymByCode as jest.Mock).mockResolvedValue(validGym);
    (mockRepo.findUserByEmail as jest.Mock).mockResolvedValue(validUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (mockRepo.findGymStaffWithPermissions as jest.Mock).mockResolvedValue(staffRecord);

    const result = await useCase.execute('FITMNL', 'staff@gym.com', 'password');

    expect(result.accessToken).toBe('access-token');
    expect(mockJwt.sign).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'gym',
        gymId: 'gym-1',
        roles: ['MANAGER'],
        permissions: expect.arrayContaining(['members.view', 'members.create']),
      }),
    );
  });

  it('returns member JWT with fixed permissions on valid member login', async () => {
    (mockRepo.findGymByCode as jest.Mock).mockResolvedValue(validGym);
    (mockRepo.findUserByEmail as jest.Mock).mockResolvedValue(validUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (mockRepo.findGymStaffWithPermissions as jest.Mock).mockResolvedValue(null);
    (mockRepo.findGymMember as jest.Mock).mockResolvedValue({ id: 'member-1' });

    const result = await useCase.execute('FITMNL', 'member@gym.com', 'password');

    expect(result.accessToken).toBe('access-token');
    expect(mockJwt.sign).toHaveBeenCalledWith(
      expect.objectContaining({
        roles: ['MEMBER'],
        permissions: ['checkins.self', 'announcements.view'],
      }),
    );
  });

  it('throws InvalidCredentialsError when gym is not found', async () => {
    (mockRepo.findGymByCode as jest.Mock).mockResolvedValue(null);

    await expect(useCase.execute('UNKNOWN', 'a@b.com', 'pw')).rejects.toThrow(
      InvalidCredentialsError,
    );
  });

  it('throws InvalidCredentialsError when user is not found', async () => {
    (mockRepo.findGymByCode as jest.Mock).mockResolvedValue(validGym);
    (mockRepo.findUserByEmail as jest.Mock).mockResolvedValue(null);

    await expect(useCase.execute('FITMNL', 'nobody@gym.com', 'pw')).rejects.toThrow(
      InvalidCredentialsError,
    );
  });

  it('throws InvalidCredentialsError when password is wrong', async () => {
    (mockRepo.findGymByCode as jest.Mock).mockResolvedValue(validGym);
    (mockRepo.findUserByEmail as jest.Mock).mockResolvedValue(validUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(useCase.execute('FITMNL', 'staff@gym.com', 'wrong')).rejects.toThrow(
      InvalidCredentialsError,
    );
  });

  it('throws InvalidCredentialsError when user has no staff or member record', async () => {
    (mockRepo.findGymByCode as jest.Mock).mockResolvedValue(validGym);
    (mockRepo.findUserByEmail as jest.Mock).mockResolvedValue(validUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (mockRepo.findGymStaffWithPermissions as jest.Mock).mockResolvedValue(null);
    (mockRepo.findGymMember as jest.Mock).mockResolvedValue(null);

    await expect(useCase.execute('FITMNL', 'staff@gym.com', 'password')).rejects.toThrow(
      InvalidCredentialsError,
    );
  });

  it('deduplicates permissions when multiple roles share a permission', async () => {
    const staffWithDuplicates = {
      id: 'staff-2',
      roles: [
        {
          role: {
            name: 'MANAGER',
            rolePermissions: [{ permission: { key: 'members.view' } }],
          },
        },
        {
          role: {
            name: 'FRONT_DESK',
            rolePermissions: [{ permission: { key: 'members.view' } }],
          },
        },
      ],
    };
    (mockRepo.findGymByCode as jest.Mock).mockResolvedValue(validGym);
    (mockRepo.findUserByEmail as jest.Mock).mockResolvedValue(validUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (mockRepo.findGymStaffWithPermissions as jest.Mock).mockResolvedValue(staffWithDuplicates);

    await useCase.execute('FITMNL', 'staff@gym.com', 'password');

    const signedPayload = (mockJwt.sign as jest.Mock).mock.calls[0][0];
    const permCount = signedPayload.permissions.filter(
      (p: string) => p === 'members.view',
    ).length;
    expect(permCount).toBe(1);
  });
});
