import { Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { DeleteMyAccountUseCase } from './delete-my-account.use-case';
import type { MembersRepository } from '../../infrastructure/persistence/members.repository';
import type { RateLimiterService } from '../../../../common/rate-limiter/rate-limiter.service';
import type { StoragePort } from '../../../../common/adapters/storage/storage.port';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import type { CacheService } from '../../../../common/cache/cache.service';
import type { ChatSessionsService } from '../../../chat/application/chat-sessions.service';

const repo = { findMemberForDeletion: jest.fn(), anonymiseMember: jest.fn() } as unknown as jest.Mocked<MembersRepository>;
const rateLimiter = { hit: jest.fn() } as unknown as jest.Mocked<RateLimiterService>;
const storage = { deleteImageByUrl: jest.fn() } as unknown as jest.Mocked<StoragePort>;
const cache = { del: jest.fn() } as unknown as jest.Mocked<CacheService>;
const chatSessions = { disconnectUser: jest.fn() } as unknown as jest.Mocked<ChatSessionsService>;
const memberRow = (overrides: Record<string, unknown> = {}) => ({
  memberId: 'member-1',
  status: 'ACTIVE',
  passwordHash,
  keepsLogin: false,
  isStaffHere: false,
  ...overrides,
});

const member: AuthenticatedUser = { type: 'gym', sub: 'user-1', gymId: 'gym-1', roles: ['MEMBER'], permissions: [] };
const PASSWORD = 'correct horse battery';
let passwordHash: string;

describe('DeleteMyAccountUseCase', () => {
  const useCase = () => new DeleteMyAccountUseCase(repo, rateLimiter, storage, cache, chatSessions);

  beforeAll(async () => {
    passwordHash = await bcrypt.hash(PASSWORD, 4);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    rateLimiter.hit.mockResolvedValue(true);
    repo.findMemberForDeletion.mockResolvedValue(memberRow());
    repo.anonymiseMember.mockResolvedValue({ photoUrls: [] });
    storage.deleteImageByUrl.mockResolvedValue(true);
    cache.del.mockResolvedValue(undefined);
    chatSessions.disconnectUser.mockResolvedValue(undefined);
  });

  it("anonymises a member's account and their login when nothing else needs it", async () => {
    await expect(useCase().execute('gym-1', PASSWORD, member)).resolves.toEqual({ loginDeleted: true });
    expect(repo.findMemberForDeletion).toHaveBeenCalledWith('gym-1', 'user-1');
    expect(repo.anonymiseMember).toHaveBeenCalledWith('member-1', 'user-1', { gymId: 'gym-1', anonymiseLogin: true, isStaffHere: false });
    expect(cache.del).toHaveBeenCalledWith('leaderboard:board:gym-1');
    expect(chatSessions.disconnectUser).toHaveBeenCalledWith('gym-1', 'user-1');
  });

  it('keeps the login of someone who is also staff (member side only)', async () => {
    repo.findMemberForDeletion.mockResolvedValue(memberRow({ keepsLogin: true }));
    await expect(useCase().execute('gym-1', PASSWORD, member)).resolves.toEqual({ loginDeleted: false });
    expect(repo.anonymiseMember).toHaveBeenCalledWith('member-1', 'user-1', { gymId: 'gym-1', anonymiseLogin: false, isStaffHere: false });
  });

  it("leaves the chat sockets of someone who is staff at this gym (they still chat as staff)", async () => {
    repo.findMemberForDeletion.mockResolvedValue(memberRow({ keepsLogin: true, isStaffHere: true }));
    await useCase().execute('gym-1', PASSWORD, member);
    expect(repo.anonymiseMember).toHaveBeenCalledWith('member-1', 'user-1', { gymId: 'gym-1', anonymiseLogin: false, isStaffHere: true });
    expect(chatSessions.disconnectUser).not.toHaveBeenCalled();
  });

  it('returns MEMBER_NOT_FOUND when a concurrent deletion got there first', async () => {
    repo.anonymiseMember.mockResolvedValue(null);
    await expect(useCase().execute('gym-1', PASSWORD, member)).rejects.toMatchObject({ code: 'MEMBER_NOT_FOUND' });
    expect(storage.deleteImageByUrl).not.toHaveBeenCalled();
  });

  it("only lets storage delete inside this member's upload folders", async () => {
    repo.anonymiseMember.mockResolvedValue({ photoUrls: ['https://res.cloudinary.com/x/image/upload/a.jpg'] });
    await useCase().execute('gym-1', PASSWORD, member);
    expect(storage.deleteImageByUrl).toHaveBeenCalledWith('https://res.cloudinary.com/x/image/upload/a.jpg', [
      'members/member-1',
      'gyms/gym-1/leaderboard',
    ]);
  });

  it('still succeeds when ending chat sessions fails, and logs it', async () => {
    chatSessions.disconnectUser.mockRejectedValue(new Error('socket server down'));
    await expect(useCase().execute('gym-1', PASSWORD, member)).resolves.toEqual({ loginDeleted: true });
    expect(Logger.prototype.error).toHaveBeenCalledWith(expect.stringContaining('chat sessions not ended'), expect.any(String));
  });

  it('refuses a wrong password without deleting anything (403, not 401)', async () => {
    await expect(useCase().execute('gym-1', 'nope', member)).rejects.toMatchObject({ code: 'INVALID_PASSWORD', statusCode: 403 });
    expect(repo.anonymiseMember).not.toHaveBeenCalled();
  });

  it('refuses when the login has no password', async () => {
    repo.findMemberForDeletion.mockResolvedValue(memberRow({ passwordHash: null }));
    await expect(useCase().execute('gym-1', PASSWORD, member)).rejects.toMatchObject({ code: 'INVALID_PASSWORD' });
  });

  it('limits password attempts', async () => {
    rateLimiter.hit.mockResolvedValue(false);
    await expect(useCase().execute('gym-1', PASSWORD, member)).rejects.toMatchObject({ code: 'RATE_LIMITED' });
    expect(rateLimiter.hit).toHaveBeenCalledWith('members:delete-account:user-1', 5, 900);
    expect(repo.findMemberForDeletion).not.toHaveBeenCalled();
  });

  it('returns MEMBER_NOT_FOUND for someone who is not a member here, or already deleted', async () => {
    repo.findMemberForDeletion.mockResolvedValueOnce(null);
    await expect(useCase().execute('gym-1', PASSWORD, member)).rejects.toMatchObject({ code: 'MEMBER_NOT_FOUND' });
    repo.findMemberForDeletion.mockResolvedValueOnce(memberRow({ status: 'DELETED' }));
    await expect(useCase().execute('gym-1', PASSWORD, member)).rejects.toMatchObject({ code: 'MEMBER_NOT_FOUND' });
  });

  it('refuses another gym', async () => {
    await expect(useCase().execute('gym-2', PASSWORD, member)).rejects.toMatchObject({ statusCode: 403 });
    expect(repo.findMemberForDeletion).not.toHaveBeenCalled();
  });

  it('removes photos after the delete, and a storage failure does not undo it', async () => {
    repo.anonymiseMember.mockResolvedValue({ photoUrls: ['https://res.cloudinary.com/x/image/upload/a.jpg', 'https://other.example/b.jpg'] });
    storage.deleteImageByUrl.mockRejectedValueOnce(new Error('cloudinary down')).mockResolvedValueOnce(false);
    await expect(useCase().execute('gym-1', PASSWORD, member)).resolves.toEqual({ loginDeleted: true });
    expect(storage.deleteImageByUrl).toHaveBeenCalledTimes(2);
    expect(Logger.prototype.error).toHaveBeenCalledWith(expect.stringContaining('photo not deleted'), expect.any(String));
  });
});
