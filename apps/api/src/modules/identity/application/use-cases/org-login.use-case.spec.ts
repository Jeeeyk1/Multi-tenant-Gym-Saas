import { OrgLoginUseCase } from './org-login.use-case';
import { InvalidCredentialsError } from '../../domain/errors/invalid-credentials.error';
import type { JwtService } from '@nestjs/jwt';
import type { ConfigService } from '@nestjs/config';
import type { IdentityRepository } from '../../infrastructure/persistence/identity.repository';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

const mockRepo = {
  findOrgBySlug: jest.fn(),
  findUserByEmail: jest.fn(),
  findOrgMember: jest.fn(),
  generateRefreshTokenPair: jest.fn().mockReturnValue({ raw: 'raw-token', hash: 'hash' }),
  saveRefreshToken: jest.fn().mockResolvedValue(undefined),
} as unknown as IdentityRepository;

const mockJwt = { sign: jest.fn().mockReturnValue('access-token') } as unknown as JwtService;

const mockConfig = {
  getOrThrow: jest.fn().mockReturnValue('7d'),
} as unknown as ConfigService;

const validOrg = { id: 'org-1', name: 'Fitlife PH', slug: 'fitlife' };
const validUser = {
  id: 'user-1',
  email: 'owner@fitlife.com',
  fullName: 'Jake',
  passwordHash: 'hashed',
  isActive: true,
  emailVerifiedAt: new Date(),
};
const validMember = { role: 'OWNER' };

describe('OrgLoginUseCase', () => {
  let useCase: OrgLoginUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new OrgLoginUseCase(mockRepo, mockJwt, mockConfig);
  });

  it('returns tokens and user on valid credentials', async () => {
    (mockRepo.findOrgBySlug as jest.Mock).mockResolvedValue(validOrg);
    (mockRepo.findUserByEmail as jest.Mock).mockResolvedValue(validUser);
    (mockRepo.findOrgMember as jest.Mock).mockResolvedValue(validMember);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const result = await useCase.execute('fitlife', 'owner@fitlife.com', 'password');

    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('raw-token');
    expect(result.user.id).toBe('user-1');
  });

  it('throws InvalidCredentialsError when org is not found', async () => {
    (mockRepo.findOrgBySlug as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute('unknown', 'a@b.com', 'password'),
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it('throws InvalidCredentialsError when user is not found', async () => {
    (mockRepo.findOrgBySlug as jest.Mock).mockResolvedValue(validOrg);
    (mockRepo.findUserByEmail as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute('fitlife', 'nobody@fitlife.com', 'password'),
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it('throws InvalidCredentialsError when user is inactive', async () => {
    (mockRepo.findOrgBySlug as jest.Mock).mockResolvedValue(validOrg);
    (mockRepo.findUserByEmail as jest.Mock).mockResolvedValue({
      ...validUser,
      isActive: false,
    });

    await expect(
      useCase.execute('fitlife', 'owner@fitlife.com', 'password'),
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it('throws InvalidCredentialsError when email is not verified', async () => {
    (mockRepo.findOrgBySlug as jest.Mock).mockResolvedValue(validOrg);
    (mockRepo.findUserByEmail as jest.Mock).mockResolvedValue({
      ...validUser,
      emailVerifiedAt: null,
    });

    await expect(
      useCase.execute('fitlife', 'owner@fitlife.com', 'password'),
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it('throws InvalidCredentialsError when user has no org membership', async () => {
    (mockRepo.findOrgBySlug as jest.Mock).mockResolvedValue(validOrg);
    (mockRepo.findUserByEmail as jest.Mock).mockResolvedValue(validUser);
    (mockRepo.findOrgMember as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute('fitlife', 'owner@fitlife.com', 'password'),
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it('throws InvalidCredentialsError when password is wrong', async () => {
    (mockRepo.findOrgBySlug as jest.Mock).mockResolvedValue(validOrg);
    (mockRepo.findUserByEmail as jest.Mock).mockResolvedValue(validUser);
    (mockRepo.findOrgMember as jest.Mock).mockResolvedValue(validMember);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      useCase.execute('fitlife', 'owner@fitlife.com', 'wrong'),
    ).rejects.toThrow(InvalidCredentialsError);
  });
});
