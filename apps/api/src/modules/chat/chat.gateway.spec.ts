import { Logger } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';

// The send handler only: live messages skip the sockets of people who blocked the sender.
describe('ChatGateway message.send', () => {
  const emit = jest.fn();
  const except = jest.fn(() => ({ emit }));
  const to = jest.fn(() => ({ except }));
  const sendMessage = { execute: jest.fn() };
  const safety = { blockerIds: jest.fn() };
  const user = { type: 'gym', sub: 'u-sender', gymId: 'gym-1', roles: ['MEMBER'], permissions: [] };
  const socket = { data: { user } };

  const gateway = () => {
    const g = new ChatGateway({} as never, {} as never, sendMessage as never, {} as never, {} as never, {} as never, { attach: jest.fn() } as never, safety as never);
    (g as unknown as { server: unknown }).server = { to };
    return g;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    sendMessage.execute.mockResolvedValue({ id: 'msg-1', content: 'hi' });
  });

  it("leaves out the rooms of people who blocked the sender", async () => {
    safety.blockerIds.mockResolvedValue(['u-x', 'u-y']);
    const ack = await gateway().handleSendMessage(socket as never, { conversationId: 'conv-1', content: 'hi' } as never);
    expect(to).toHaveBeenCalledWith('conversation:conv-1');
    expect(except).toHaveBeenCalledWith(['gym-user:gym-1:u-x', 'gym-user:gym-1:u-y']);
    expect(emit).toHaveBeenCalledWith('message.new', { id: 'msg-1', content: 'hi' });
    expect(ack).toMatchObject({ ok: true });
  });

  it('still acks a saved message when the blockers lookup fails (no duplicate resend)', async () => {
    safety.blockerIds.mockRejectedValue(new Error('db blip'));
    const ack = await gateway().handleSendMessage(socket as never, { conversationId: 'conv-1', content: 'hi' } as never);
    expect(except).toHaveBeenCalledWith([]);
    expect(ack).toMatchObject({ ok: true });
  });
});
