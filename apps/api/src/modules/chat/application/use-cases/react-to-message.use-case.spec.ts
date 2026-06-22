import { ReactToMessageUseCase } from './react-to-message.use-case';
import type { ChatRepository } from '../../infrastructure/persistence/chat.repository';

const mockRepo = {
  findConversation: jest.fn(),
  findMessageById: jest.fn(),
  findMembership: jest.fn(),
  upsertMembership: jest.fn(),
  findReaction: jest.fn(),
  addReaction: jest.fn(),
  removeReaction: jest.fn(),
} as unknown as jest.Mocked<ChatRepository>;

function makeCaller(gymId = 'gym-1') {
  return { type: 'gym' as const, sub: 'user-1', gymId, permissions: [], roles: [] };
}

function makeMessage(isDeleted = false) {
  return { id: 'msg-1', conversationId: 'conv-1', senderId: 'other', isDeleted };
}

function makeMembership() {
  return { id: 'mem-1', role: 'MEMBER', lastReadAt: new Date(), isMuted: false };
}

describe('ReactToMessageUseCase', () => {
  beforeEach(() => jest.resetAllMocks());

  it('adds a reaction when none exists', async () => {
    mockRepo.findMessageById.mockResolvedValue(makeMessage());
    mockRepo.findMembership.mockResolvedValue(makeMembership());
    mockRepo.findReaction.mockResolvedValue(null);
    mockRepo.addReaction.mockResolvedValue(undefined as any);

    const uc = new ReactToMessageUseCase(mockRepo);
    const result = await uc.execute('gym-1', 'conv-1', 'msg-1', '👍', makeCaller());

    expect(mockRepo.addReaction).toHaveBeenCalledWith('msg-1', 'user-1', '👍');
    expect(mockRepo.removeReaction).not.toHaveBeenCalled();
    expect(result).toEqual({ action: 'added', emoji: '👍' });
  });

  it('removes a reaction when it already exists (toggle)', async () => {
    mockRepo.findMessageById.mockResolvedValue(makeMessage());
    mockRepo.findMembership.mockResolvedValue(makeMembership());
    mockRepo.findReaction.mockResolvedValue({ id: 'rxn-1' });
    mockRepo.removeReaction.mockResolvedValue(undefined as any);

    const uc = new ReactToMessageUseCase(mockRepo);
    const result = await uc.execute('gym-1', 'conv-1', 'msg-1', '👍', makeCaller());

    expect(mockRepo.removeReaction).toHaveBeenCalledWith('msg-1', 'user-1', '👍');
    expect(mockRepo.addReaction).not.toHaveBeenCalled();
    expect(result).toEqual({ action: 'removed', emoji: '👍' });
  });

  it('throws GYM_ACCESS_DENIED when caller belongs to a different gym', async () => {
    const uc = new ReactToMessageUseCase(mockRepo);
    await expect(
      uc.execute('gym-1', 'conv-1', 'msg-1', '👍', makeCaller('other-gym')),
    ).rejects.toMatchObject({ code: 'GYM_ACCESS_DENIED' });
  });

  it('throws MESSAGE_NOT_FOUND when message does not exist', async () => {
    mockRepo.findMessageById.mockResolvedValue(null);

    const uc = new ReactToMessageUseCase(mockRepo);
    await expect(
      uc.execute('gym-1', 'conv-1', 'msg-1', '👍', makeCaller()),
    ).rejects.toMatchObject({ code: 'MESSAGE_NOT_FOUND' });
  });

  it('throws MESSAGE_NOT_FOUND when message is deleted', async () => {
    mockRepo.findMessageById.mockResolvedValue(makeMessage(true));

    const uc = new ReactToMessageUseCase(mockRepo);
    await expect(
      uc.execute('gym-1', 'conv-1', 'msg-1', '👍', makeCaller()),
    ).rejects.toMatchObject({ code: 'MESSAGE_NOT_FOUND' });
  });

  it('throws NOT_CONVERSATION_MEMBER when caller is not in the conversation', async () => {
    mockRepo.findMessageById.mockResolvedValue(makeMessage());
    mockRepo.findMembership.mockResolvedValue(null);

    const uc = new ReactToMessageUseCase(mockRepo);
    await expect(
      uc.execute('gym-1', 'conv-1', 'msg-1', '👍', makeCaller()),
    ).rejects.toMatchObject({ code: 'NOT_CONVERSATION_MEMBER' });
  });
});
