import { SendMessageUseCase } from './send-message.use-case';
import type { ChatRepository } from '../../infrastructure/persistence/chat.repository';
import type { ChatSafetyRepository } from '../../infrastructure/persistence/chat-safety.repository';
import type { CommunityRulesPolicy } from '../community-rules.policy';

const mockRepo = {
  findConversation: jest.fn(),
  findMembership: jest.fn(),
  upsertMembership: jest.fn(),
  findGymMemberStatus: jest.fn(),
  createMessage: jest.fn(),
  findMessageById: jest.fn(),
} as unknown as jest.Mocked<ChatRepository>;

// Rules accepted by default; the rules tests below override it.
const mockSafety = { rulesVersion: jest.fn().mockResolvedValue(1) } as unknown as jest.Mocked<ChatSafetyRepository>;
const mockPolicy = { isEnforced: jest.fn() } as unknown as jest.Mocked<CommunityRulesPolicy>;

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
    mockRepo.upsertMembership.mockResolvedValue(makeMembership());
    mockRepo.findGymMemberStatus.mockResolvedValue({ status: 'ACTIVE' });
    mockRepo.createMessage.mockResolvedValue(makeMessage());

    const uc = new SendMessageUseCase(mockRepo, mockSafety, mockPolicy);
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
    mockRepo.upsertMembership.mockResolvedValue(makeMembership());
    mockRepo.findGymMemberStatus.mockResolvedValue(null); // staff — no member record
    mockRepo.createMessage.mockResolvedValue(makeMessage());

    const uc = new SendMessageUseCase(mockRepo, mockSafety, mockPolicy);
    await expect(
      uc.execute('gym-1', 'conv-1', { content: 'Hello!' }, makeCaller()),
    ).resolves.toEqual(makeMessage());
  });

  it('throws MEMBERSHIP_NOT_ACTIVE when member status is EXPIRED', async () => {
    mockRepo.findConversation.mockResolvedValue(makeConversation());
    mockRepo.upsertMembership.mockResolvedValue(makeMembership());
    mockRepo.findGymMemberStatus.mockResolvedValue({ status: 'EXPIRED' });

    const uc = new SendMessageUseCase(mockRepo, mockSafety, mockPolicy);
    await expect(
      uc.execute('gym-1', 'conv-1', { content: 'Hi' }, makeCaller()),
    ).rejects.toMatchObject({ code: 'MEMBERSHIP_NOT_ACTIVE' });
  });

  it('throws CONVERSATION_NOT_FOUND when conversation does not exist', async () => {
    mockRepo.findConversation.mockResolvedValue(null);

    const uc = new SendMessageUseCase(mockRepo, mockSafety, mockPolicy);
    await expect(
      uc.execute('gym-1', 'conv-1', { content: 'Hi' }, makeCaller()),
    ).rejects.toMatchObject({ code: 'CONVERSATION_NOT_FOUND' });
  });

  it('throws NOT_CONVERSATION_MEMBER when caller is not in the conversation', async () => {
    mockRepo.findConversation.mockResolvedValue({ ...makeConversation(), type: 'DIRECT' });
    mockRepo.findMembership.mockResolvedValue(null);

    const uc = new SendMessageUseCase(mockRepo, mockSafety, mockPolicy);
    await expect(
      uc.execute('gym-1', 'conv-1', { content: 'Hi' }, makeCaller()),
    ).rejects.toMatchObject({ code: 'NOT_CONVERSATION_MEMBER' });
  });

  it('throws GYM_ACCESS_DENIED when caller belongs to a different gym', async () => {
    const uc = new SendMessageUseCase(mockRepo, mockSafety, mockPolicy);
    await expect(
      uc.execute('gym-1', 'conv-1', { content: 'Hi' }, makeCaller('other-gym')),
    ).rejects.toMatchObject({ code: 'GYM_ACCESS_DENIED' });
  });

  it('throws REPLY_TARGET_NOT_FOUND when replyToId is not a message in this conversation', async () => {
    mockRepo.findConversation.mockResolvedValue(makeConversation());
    mockRepo.upsertMembership.mockResolvedValue(makeMembership());
    mockRepo.findGymMemberStatus.mockResolvedValue({ status: 'ACTIVE' });
    mockRepo.findMessageById.mockResolvedValue(null);

    const uc = new SendMessageUseCase(mockRepo, mockSafety, mockPolicy);
    await expect(
      uc.execute('gym-1', 'conv-1', { content: 'hi', replyToId: 'msg-elsewhere' }, makeCaller()),
    ).rejects.toMatchObject({ code: 'REPLY_TARGET_NOT_FOUND' });
    expect(mockRepo.findMessageById).toHaveBeenCalledWith('msg-elsewhere', 'conv-1');
    expect(mockRepo.createMessage).not.toHaveBeenCalled();
  });

  it('allows a reply to a message in the same conversation', async () => {
    mockRepo.findConversation.mockResolvedValue(makeConversation());
    mockRepo.upsertMembership.mockResolvedValue(makeMembership());
    mockRepo.findGymMemberStatus.mockResolvedValue({ status: 'ACTIVE' });
    mockRepo.findMessageById.mockResolvedValue({ id: 'msg-0' } as any);
    mockRepo.createMessage.mockResolvedValue(makeMessage());

    const uc = new SendMessageUseCase(mockRepo, mockSafety, mockPolicy);
    await uc.execute('gym-1', 'conv-1', { content: 'hi', replyToId: 'msg-0' }, makeCaller());

    expect(mockRepo.createMessage).toHaveBeenCalledWith(expect.objectContaining({ replyToId: 'msg-0' }));
  });

  it('refuses a member-only token whose member record is gone (deleted account)', async () => {
    mockRepo.findConversation.mockResolvedValue(makeConversation());
    mockRepo.upsertMembership.mockResolvedValue(makeMembership());
    mockRepo.findGymMemberStatus.mockResolvedValue(null);

    const uc = new SendMessageUseCase(mockRepo, mockSafety, mockPolicy);
    await expect(
      uc.execute('gym-1', 'conv-1', { content: 'still here?' }, { ...makeCaller(), roles: ['MEMBER'] }),
    ).rejects.toMatchObject({ code: 'MEMBERSHIP_NOT_ACTIVE' });
    expect(mockRepo.createMessage).not.toHaveBeenCalled();
  });

  describe('community rules', () => {
    const member = { ...makeCaller(), roles: ['MEMBER'] };

    beforeEach(() => {
      mockRepo.findConversation.mockResolvedValue(makeConversation());
      mockRepo.upsertMembership.mockResolvedValue(makeMembership());
      mockRepo.findGymMemberStatus.mockResolvedValue({ status: 'ACTIVE' });
      mockRepo.createMessage.mockResolvedValue(makeMessage());
      mockPolicy.isEnforced.mockReturnValue(true);
    });

    it('refuses a member who has not accepted the current rules', async () => {
      mockSafety.rulesVersion.mockResolvedValueOnce(null);
      await expect(new SendMessageUseCase(mockRepo, mockSafety, mockPolicy).execute('gym-1', 'conv-1', { content: 'hi' }, member)).rejects.toMatchObject({
        code: 'COMMUNITY_RULES_NOT_ACCEPTED',
      });
      expect(mockRepo.createMessage).not.toHaveBeenCalled();
    });

    it('lets a member post once they accepted', async () => {
      mockSafety.rulesVersion.mockResolvedValueOnce(1);
      await expect(new SendMessageUseCase(mockRepo, mockSafety, mockPolicy).execute('gym-1', 'conv-1', { content: 'hi' }, member)).resolves.toEqual(makeMessage());
    });

    it('does not ask staff to accept', async () => {
      mockSafety.rulesVersion.mockClear();
      mockRepo.findGymMemberStatus.mockResolvedValue(null);
      await new SendMessageUseCase(mockRepo, mockSafety, mockPolicy).execute('gym-1', 'conv-1', { content: 'hi' }, { ...makeCaller(), roles: ['STAFF'] });
      expect(mockSafety.rulesVersion).not.toHaveBeenCalled();
    });

    it('does not ask a staff member who is also a member', async () => {
      mockSafety.rulesVersion.mockClear();
      await new SendMessageUseCase(mockRepo, mockSafety, mockPolicy).execute('gym-1', 'conv-1', { content: 'hi' }, { ...makeCaller(), roles: ['STAFF', 'MEMBER'] });
      expect(mockSafety.rulesVersion).not.toHaveBeenCalled();
    });

    it('lets everyone post while the rules are not enforced yet (older apps)', async () => {
      mockPolicy.isEnforced.mockReturnValue(false);
      mockSafety.rulesVersion.mockResolvedValueOnce(null);
      await expect(new SendMessageUseCase(mockRepo, mockSafety, mockPolicy).execute('gym-1', 'conv-1', { content: 'hi' }, member)).resolves.toEqual(makeMessage());
    });
  });
});
