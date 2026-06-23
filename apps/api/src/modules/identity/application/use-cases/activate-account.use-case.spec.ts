import { ActivateAccountUseCase } from './activate-account.use-case';
import { TokenInvalidError } from '../../domain/errors/token-invalid.error';
import type { IdentityRepository } from '../../infrastructure/persistence/identity.repository';
import type { EmailService } from '../../../../common/email/email.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

const mockRepo = {
  findInviteToken: jest.fn(),
  activateAccount: jest.fn().mockResolvedValue(undefined),
  findUserWithFirstGymStaff: jest.fn().mockResolvedValue(null),
  findUserWithFirstGymMember: jest.fn().mockResolvedValue(null),
} as unknown as IdentityRepository;

const mockEmail = {
  sendWelcome: jest.fn().mockResolvedValue(undefined),
  sendMemberWelcome: jest.fn().mockResolvedValue(undefined),
} as unknown as EmailService;

describe('ActivateAccountUseCase', () => {
  let useCase: ActivateAccountUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new ActivateAccountUseCase(mockRepo, mockEmail);
  });

  it('activates the account when token is valid', async () => {
    (mockRepo.findInviteToken as jest.Mock).mockResolvedValue({
      id: 'token-1',
      userId: 'user-1',
      type: 'MEMBER_INVITE',
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

  it('sends welcome email for staff INVITE token', async () => {
    (mockRepo.findInviteToken as jest.Mock).mockResolvedValue({
      id: 'token-2',
      userId: 'user-2',
      type: 'INVITE',
    });
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    (mockRepo.findUserWithFirstGymStaff as jest.Mock).mockResolvedValue({
      email: 'staff@gym.com',
      fullName: 'Staff User',
      gymStaff: [{ gym: { name: 'Test Gym', code: 'TGYM' } }],
    });

    await useCase.execute('staff-invite-token', 'NewPassword1!');

    // Give fire-and-forget a tick to settle
    await new Promise((r) => setTimeout(r, 0));

    expect(mockEmail.sendWelcome).toHaveBeenCalledWith({
      to: 'staff@gym.com',
      fullName: 'Staff User',
      gymName: 'Test Gym',
      gymCode: 'TGYM',
    });
  });

  it('sends member welcome email for MEMBER_INVITE token', async () => {
    (mockRepo.findInviteToken as jest.Mock).mockResolvedValue({
      id: 'token-3',
      userId: 'user-3',
      type: 'MEMBER_INVITE',
    });
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    (mockRepo.findUserWithFirstGymMember as jest.Mock).mockResolvedValue({
      email: 'member@gym.com',
      fullName: 'Member User',
      gymMembers: [{ gym: { name: 'Test Gym', code: 'TGYM' } }],
    });

    await useCase.execute('member-invite-token', 'NewPassword1!');

    await new Promise((r) => setTimeout(r, 0));

    expect(mockEmail.sendMemberWelcome).toHaveBeenCalledWith({
      to: 'member@gym.com',
      fullName: 'Member User',
      gymName: 'Test Gym',
      gymCode: 'TGYM',
    });
    expect(mockEmail.sendWelcome).not.toHaveBeenCalled();
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
