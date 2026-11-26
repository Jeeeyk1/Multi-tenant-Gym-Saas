import { ListMessagesUseCase } from './list-messages.use-case';
import type { ChatRepository } from '../../infrastructure/persistence/chat.repository';
import type { ChatSafetyRepository } from '../../infrastructure/persistence/chat-safety.repository';

const repo = { findConversation: jest.fn(), upsertMembership: jest.fn(), findMembership: jest.fn(), listMessages: jest.fn() } as unknown as jest.Mocked<ChatRepository>;
const safety = { blockedIds: jest.fn() } as unknown as jest.Mocked<ChatSafetyRepository>;
const caller = { type: 'gym' as const, sub: 'u-a', gymId: 'gym-1', roles: ['MEMBER'], permissions: [] };

const message = (id: string, replyTo: { senderId: string; content: string } | null = null) => ({
  id,
  senderId: 'u-c',
  content: `text ${id}`,
  replyTo: replyTo && { id: `parent-${id}`, senderId: replyTo.senderId, content: replyTo.content, isDeleted: false, sender: { id: replyTo.senderId, fullName: 'Someone' } },
});

describe('ListMessagesUseCase', () => {
  const useCase = () => new ListMessagesUseCase(repo, safety);

  beforeEach(() => {
    jest.clearAllMocks();
    repo.findConversation.mockResolvedValue({ id: 'conv-1', type: 'COMMUNITY' } as never);
    repo.upsertMembership.mockResolvedValue({ id: 'm' } as never);
  });

  it('leaves out messages from people the caller blocked', async () => {
    safety.blockedIds.mockResolvedValue(['u-b']);
    repo.listMessages.mockResolvedValue([] as never);
    await useCase().execute('gym-1', 'conv-1', caller, { limit: 10 });
    expect(repo.listMessages).toHaveBeenCalledWith('conv-1', { limit: 10, before: undefined, excludeSenderIds: ['u-b'] });
  });

  it("hides a blocked person's text quoted in someone else's reply", async () => {
    safety.blockedIds.mockResolvedValue(['u-b']);
    repo.listMessages.mockResolvedValue([message('1', { senderId: 'u-b', content: 'blocked text' }), message('2', { senderId: 'u-c', content: 'fine' })] as never);
    const [hidden, shown] = (await useCase().execute('gym-1', 'conv-1', caller, {})) as unknown as ReturnType<typeof message>[];
    expect(hidden.replyTo).toMatchObject({ content: null, isDeleted: true });
    expect(shown.replyTo).toMatchObject({ content: 'fine', isDeleted: false });
  });

  it('changes nothing when the caller blocked no one', async () => {
    safety.blockedIds.mockResolvedValue([]);
    const messages = [message('1', { senderId: 'u-b', content: 'quoted' })];
    repo.listMessages.mockResolvedValue(messages as never);
    await expect(useCase().execute('gym-1', 'conv-1', caller, {})).resolves.toBe(messages);
  });
});
