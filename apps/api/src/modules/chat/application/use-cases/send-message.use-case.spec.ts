import { SendMessageUseCase } from './send-message.use-case';
import type { ChatRepository } from '../../infrastructure/persistence/chat.repository';

const mockRepo = {
  findConversation: jest.fn(),
  findMembership: jest.fn(),
  findGymMemberStatus: jest.fn(),
  createMessage: jest.fn(),
} as unknown as jest.Mocked<ChatRepository>;

function makeCaller(gymId = 'gym-1') {
  return {
    type: 'gym' as const,
    sub: 'user-1',
    gymId,
    permissions: [],
    roles: [],
  };
}

function makeConversation() {
  return { id: 'conv-1', gymId: 'gym-1', type: 'COMMUNITY', name: null, isDefault: true, isAnnouncementOnly: false };
}

function makeMembership() {
  return { id: 'mem-1', role: 'MEMBER', lastReadAt: new Date(), isMuted: false };
}

function makeMessage() {
  return { id: 'msg-1', conversationId: 'conv-1', senderId: 'user-1', content: 'Hello!' } as any;
}

describe('SendMessageUseCase', () => {
  beforeEach(() => jest.resetAllMocks());

  it('sends a message for an ACTIVE member', async () => {
    mockRepo.findConversation.mockResolvedValue(makeConversation());
    mockRepo.findMembership.mockResolvedValue(makeMembership());
    mockRepo.findGymMemberStatus.mockResolvedValue({ status: 'ACTIVE' });
    mockRepo.createMessage.mockResolvedValue(makeMessage());

    const uc = new SendMessageUseCase(mockRepo);
    const result = await uc.execute('gym-1', 'conv-1', { content: 'Hello!' }, makeCaller());

    expect(mockRepo.createMessage).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      senderId: 'user-1',
      type: 'TEXT',
      content: 'Hello!',
      replyToId: undefined,
    });
    expect(result).toEqual(makeMessage());
  });

  it('sends a message for staff with no gym_member record', async () => {
    mockRepo.findConversation.mockResolvedValue(makeConversation());
    mockRepo.findMembership.mockResolvedValue(makeMembership());
    mockRepo.findGymMemberStatus.mockResolvedValue(null); // staff — no member record
    mockRepo.createMessage.mockResolvedValue(makeMessage());

    const uc = new SendMessageUseCase(mockRepo);
    await expect(
      uc.execute('gym-1', 'conv-1', { content: 'Hello!' }, makeCaller()),
    ).resolves.toEqual(makeMessage());
  });

  it('throws MEMBERSHIP_NOT_ACTIVE when member status is EXPIRED', async () => {
    mockRepo.findConversation.mockResolvedValue(makeConversation());
    mockRepo.findMembership.mockResolvedValue(makeMembership());
    mockRepo.findGymMemberStatus.mockResolvedValue({ status: 'EXPIRED' });

    const uc = new SendMessageUseCase(mockRepo);
    await expect(
      uc.execute('gym-1', 'conv-1', { content: 'Hi' }, makeCaller()),
    ).rejects.toMatchObject({ code: 'MEMBERSHIP_NOT_ACTIVE' });
  });

  it('throws CONVERSATION_NOT_FOUND when conversation does not exist', async () => {
    mockRepo.findConversation.mockResolvedValue(null);

    const uc = new SendMessageUseCase(mockRepo);
    await expect(
      uc.execute('gym-1', 'conv-1', { content: 'Hi' }, makeCaller()),
    ).rejects.toMatchObject({ code: 'CONVERSATION_NOT_FOUND' });
  });

  it('throws NOT_CONVERSATION_MEMBER when caller is not in the conversation', async () => {
    mockRepo.findConversation.mockResolvedValue(makeConversation());
    mockRepo.findMembership.mockResolvedValue(null);

    const uc = new SendMessageUseCase(mockRepo);
    await expect(
      uc.execute('gym-1', 'conv-1', { content: 'Hi' }, makeCaller()),
    ).rejects.toMatchObject({ code: 'NOT_CONVERSATION_MEMBER' });
  });

  it('throws GYM_ACCESS_DENIED when caller belongs to a different gym', async () => {
    const uc = new SendMessageUseCase(mockRepo);
    await expect(
      uc.execute('gym-1', 'conv-1', { content: 'Hi' }, makeCaller('other-gym')),
    ).rejects.toMatchObject({ code: 'GYM_ACCESS_DENIED' });
  });
});
