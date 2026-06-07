import { DeleteMessageUseCase } from './delete-message.use-case';
import type { ChatRepository } from '../../infrastructure/persistence/chat.repository';

const mockRepo = {
  findMessageById: jest.fn(),
  softDeleteMessage: jest.fn(),
} as unknown as jest.Mocked<ChatRepository>;

function makeCaller(opts: { gymId?: string; permissions?: string[] } = {}) {
  return {
    type: 'gym' as const,
    sub: 'user-1',
    gymId: opts.gymId ?? 'gym-1',
    permissions: opts.permissions ?? [],
    roles: [],
  };
}

function makeMessage(opts: { senderId?: string; isDeleted?: boolean } = {}) {
  return {
    id: 'msg-1',
    conversationId: 'conv-1',
    senderId: opts.senderId ?? 'user-1',
    isDeleted: opts.isDeleted ?? false,
  };
}

describe('DeleteMessageUseCase', () => {
  beforeEach(() => jest.resetAllMocks());

  it('sender can delete their own message', async () => {
    mockRepo.findMessageById.mockResolvedValue(makeMessage());
    mockRepo.softDeleteMessage.mockResolvedValue({ id: 'msg-1', isDeleted: true } as any);

    const uc = new DeleteMessageUseCase(mockRepo);
    const result = await uc.execute('gym-1', 'conv-1', 'msg-1', makeCaller());

    expect(mockRepo.softDeleteMessage).toHaveBeenCalledWith('msg-1');
    expect(result).toMatchObject({ isDeleted: true });
  });

  it('staff with chat.manage can delete any message', async () => {
    mockRepo.findMessageById.mockResolvedValue(makeMessage({ senderId: 'other-user' }));
    mockRepo.softDeleteMessage.mockResolvedValue({ id: 'msg-1', isDeleted: true } as any);

    const uc = new DeleteMessageUseCase(mockRepo);
    await expect(
      uc.execute('gym-1', 'conv-1', 'msg-1', makeCaller({ permissions: ['chat.manage'] })),
    ).resolves.toMatchObject({ isDeleted: true });
  });

  it('throws GYM_ACCESS_DENIED when caller belongs to a different gym', async () => {
    const uc = new DeleteMessageUseCase(mockRepo);
    await expect(
      uc.execute('gym-1', 'conv-1', 'msg-1', makeCaller({ gymId: 'other-gym' })),
    ).rejects.toMatchObject({ code: 'GYM_ACCESS_DENIED' });
  });

  it('throws MESSAGE_NOT_FOUND when message does not exist', async () => {
    mockRepo.findMessageById.mockResolvedValue(null);

    const uc = new DeleteMessageUseCase(mockRepo);
    await expect(
      uc.execute('gym-1', 'conv-1', 'msg-1', makeCaller()),
    ).rejects.toMatchObject({ code: 'MESSAGE_NOT_FOUND' });
  });

  it('throws MESSAGE_NOT_FOUND when message is already deleted', async () => {
    mockRepo.findMessageById.mockResolvedValue(makeMessage({ isDeleted: true }));

    const uc = new DeleteMessageUseCase(mockRepo);
    await expect(
      uc.execute('gym-1', 'conv-1', 'msg-1', makeCaller()),
    ).rejects.toMatchObject({ code: 'MESSAGE_NOT_FOUND' });
  });

  it('throws MESSAGE_CANNOT_DELETE when not sender and no chat.manage', async () => {
    mockRepo.findMessageById.mockResolvedValue(makeMessage({ senderId: 'other-user' }));

    const uc = new DeleteMessageUseCase(mockRepo);
    await expect(
      uc.execute('gym-1', 'conv-1', 'msg-1', makeCaller()),
    ).rejects.toMatchObject({ code: 'MESSAGE_CANNOT_DELETE' });
  });
});
