import { MarkConversationReadUseCase } from './mark-conversation-read.use-case';
import type { ChatRepository } from '../../infrastructure/persistence/chat.repository';

const mockRepo = {
  findConversation: jest.fn(),
  findMembership: jest.fn(),
  upsertMembership: jest.fn(),
  markRead: jest.fn(),
} as unknown as jest.Mocked<ChatRepository>;

function makeCaller(gymId = 'gym-1') {
  return { type: 'gym' as const, sub: 'user-1', gymId, permissions: [], roles: [] };
}

function makeConversation() {
  return { id: 'conv-1', gymId: 'gym-1', type: 'COMMUNITY', name: null, isDefault: true, isAnnouncementOnly: false };
}

function makeMembership() {
  return { id: 'mem-1', role: 'MEMBER', lastReadAt: new Date(), isMuted: false };
}

describe('MarkConversationReadUseCase', () => {
  beforeEach(() => jest.resetAllMocks());

  it('updates last_read_at and returns it', async () => {
    const ts = new Date('2026-04-20T10:00:00Z');
    mockRepo.findConversation.mockResolvedValue(makeConversation());
    mockRepo.upsertMembership.mockResolvedValue(makeMembership());
    mockRepo.markRead.mockResolvedValue({ lastReadAt: ts });

    const uc = new MarkConversationReadUseCase(mockRepo);
    const result = await uc.execute('gym-1', 'conv-1', makeCaller());

    expect(mockRepo.markRead).toHaveBeenCalledWith('conv-1', 'user-1');
    expect(result).toEqual({ lastReadAt: ts });
  });

  it('throws GYM_ACCESS_DENIED when caller belongs to a different gym', async () => {
    const uc = new MarkConversationReadUseCase(mockRepo);
    await expect(
      uc.execute('gym-1', 'conv-1', makeCaller('other-gym')),
    ).rejects.toMatchObject({ code: 'GYM_ACCESS_DENIED' });
  });


  it('throws CONVERSATION_NOT_FOUND when conversation does not exist', async () => {
    mockRepo.findConversation.mockResolvedValue(null);

    const uc = new MarkConversationReadUseCase(mockRepo);
    await expect(
      uc.execute('gym-1', 'conv-1', makeCaller()),
    ).rejects.toMatchObject({ code: 'CONVERSATION_NOT_FOUND' });
  });

  it('throws NOT_CONVERSATION_MEMBER when caller is not in the conversation', async () => {
    mockRepo.findConversation.mockResolvedValue({ ...makeConversation(), type: 'DIRECT' });
    mockRepo.findMembership.mockResolvedValue(null);

    const uc = new MarkConversationReadUseCase(mockRepo);
    await expect(
      uc.execute('gym-1', 'conv-1', makeCaller()),
    ).rejects.toMatchObject({ code: 'NOT_CONVERSATION_MEMBER' });
  });
});
