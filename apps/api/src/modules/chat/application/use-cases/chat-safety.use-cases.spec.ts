import { Logger } from '@nestjs/common';
import { ReportMessageUseCase } from './report-message.use-case';
import { BlockUserUseCase } from './block-user.use-case';
import { UnblockUserUseCase } from './unblock-user.use-case';
import { AcceptCommunityRulesUseCase, GetCommunityRulesUseCase } from './community-rules.use-case';
import { ListReportsUseCase } from './list-reports.use-case';
import { ResolveReportUseCase } from './resolve-report.use-case';
import type { ChatSafetyRepository } from '../../infrastructure/persistence/chat-safety.repository';
import type { ChatSessionsService } from '../chat-sessions.service';
import type { CommunityRulesPolicy } from '../community-rules.policy';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { ReportAction, ReportReason } from '../../../../common/enums';
import { COMMUNITY_RULES_VERSION } from '../../domain/community-rules';

const safety = {
  findMessageInGym: jest.fn(),
  isConversationMember: jest.fn(),
  createReport: jest.fn(),
  openReportQueue: jest.fn(),
  resolveReports: jest.fn(),
  removeReportedMessage: jest.fn(),
  isPersonInGym: jest.fn(),
  block: jest.fn(),
  unblock: jest.fn(),
  rulesVersion: jest.fn(),
  acceptRules: jest.fn(),
} as unknown as jest.Mocked<ChatSafetyRepository>;
const sessions = { announceMessageDeleted: jest.fn() } as unknown as jest.Mocked<ChatSessionsService>;
const policy = { isEnforced: jest.fn(() => true) } as unknown as jest.Mocked<CommunityRulesPolicy>;

const member: AuthenticatedUser = { type: 'gym', sub: 'u-member', gymId: 'gym-1', roles: ['MEMBER'], permissions: [] };
const moderator: AuthenticatedUser = { type: 'gym', sub: 'u-staff', gymId: 'gym-1', roles: ['STAFF'], permissions: ['chat.manage'] };
const communityMessage = { id: 'msg-1', senderId: 'u-other', isDeleted: false, conversationId: 'conv-1', conversation: { type: 'COMMUNITY' } };

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
});

describe('ReportMessageUseCase', () => {
  const report = (caller = member, gymId = 'gym-1') =>
    new ReportMessageUseCase(safety).execute(gymId, 'msg-1', { reason: ReportReason.HARASSMENT, note: '  rude  ' }, caller);

  it("files a report on a message in this gym's community chat", async () => {
    safety.findMessageInGym.mockResolvedValue(communityMessage);
    safety.createReport.mockResolvedValue(true);
    await expect(report()).resolves.toEqual({ ok: true });
    expect(safety.findMessageInGym).toHaveBeenCalledWith('msg-1', 'gym-1');
    expect(safety.createReport).toHaveBeenCalledWith({ gymId: 'gym-1', messageId: 'msg-1', reporterUserId: 'u-member', reason: 'HARASSMENT', note: 'rude' });
  });

  it('is fine to report the same message twice (nothing new is logged)', async () => {
    safety.findMessageInGym.mockResolvedValue(communityMessage);
    safety.createReport.mockResolvedValue(false);
    await expect(report()).resolves.toEqual({ ok: true });
    expect(Logger.prototype.warn).not.toHaveBeenCalled();
  });

  it("refuses a message from another gym, a deleted one, or the caller's own", async () => {
    safety.findMessageInGym.mockResolvedValueOnce(null);
    await expect(report()).rejects.toMatchObject({ code: 'MESSAGE_NOT_FOUND' });
    safety.findMessageInGym.mockResolvedValueOnce({ ...communityMessage, isDeleted: true });
    await expect(report()).rejects.toMatchObject({ code: 'MESSAGE_NOT_FOUND' });
    safety.findMessageInGym.mockResolvedValueOnce({ ...communityMessage, senderId: 'u-member' });
    await expect(report()).rejects.toMatchObject({ code: 'CANNOT_REPORT_OWN' });
    expect(safety.createReport).not.toHaveBeenCalled();
  });

  it('needs conversation membership outside community chat', async () => {
    safety.findMessageInGym.mockResolvedValue({ ...communityMessage, conversation: { type: 'DIRECT' } });
    safety.isConversationMember.mockResolvedValue(false);
    await expect(report()).rejects.toMatchObject({ code: 'NOT_CONVERSATION_MEMBER' });
  });

  it('refuses a caller from another gym before looking anything up', async () => {
    await expect(report(member, 'gym-2')).rejects.toMatchObject({ statusCode: 403 });
    expect(safety.findMessageInGym).not.toHaveBeenCalled();
  });
});

describe('BlockUserUseCase / UnblockUserUseCase', () => {
  it('blocks someone in this gym', async () => {
    safety.isPersonInGym.mockResolvedValue(true);
    await expect(new BlockUserUseCase(safety).execute('gym-1', 'u-other', member)).resolves.toEqual({ ok: true });
    expect(safety.isPersonInGym).toHaveBeenCalledWith('gym-1', 'u-other');
    expect(safety.block).toHaveBeenCalledWith('u-member', 'u-other');
  });

  it("refuses yourself and people who aren't in this gym", async () => {
    await expect(new BlockUserUseCase(safety).execute('gym-1', 'u-member', member)).rejects.toMatchObject({ code: 'CANNOT_BLOCK_SELF' });
    safety.isPersonInGym.mockResolvedValue(false);
    await expect(new BlockUserUseCase(safety).execute('gym-1', 'u-stranger', member)).rejects.toMatchObject({ code: 'USER_NOT_FOUND' });
    expect(safety.block).not.toHaveBeenCalled();
  });

  it('unblocks by id and refuses something that is not an id', async () => {
    await new UnblockUserUseCase(safety).execute('gym-1', '00000000-0000-0000-0001-000000000005', member);
    expect(safety.unblock).toHaveBeenCalledWith('u-member', '00000000-0000-0000-0001-000000000005');
    await expect(new UnblockUserUseCase(safety).execute('gym-1', 'nope', member)).rejects.toMatchObject({ code: 'INVALID_USER_ID' });
  });
});

describe('community rules', () => {
  it('reports whether the caller accepted the current version', async () => {
    safety.rulesVersion.mockResolvedValueOnce(null);
    await expect(new GetCommunityRulesUseCase(safety, policy).execute('gym-1', member)).resolves.toMatchObject({
      version: COMMUNITY_RULES_VERSION,
      accepted: false,
      required: true,
      rules: expect.any(Array),
    });
  });

  it('accepts only the current version', async () => {
    await expect(new AcceptCommunityRulesUseCase(safety, policy).execute('gym-1', COMMUNITY_RULES_VERSION, member)).resolves.toMatchObject({ accepted: true });
    expect(safety.acceptRules).toHaveBeenCalledWith('u-member', COMMUNITY_RULES_VERSION);
    await expect(new AcceptCommunityRulesUseCase(safety, policy).execute('gym-1', COMMUNITY_RULES_VERSION + 1, member)).rejects.toMatchObject({
      code: 'RULES_OUTDATED',
    });
  });
});

describe('moderation', () => {
  const row = (id: string, messageId: string, reporter: string) => ({
    id,
    reason: 'SPAM',
    note: null,
    createdAt: new Date(`2026-11-27T0${id}:00:00Z`),
    reporter: { id: reporter, fullName: reporter },
    message: {
      id: messageId,
      content: 'buy now',
      isDeleted: false,
      sentAt: new Date('2026-11-27T00:00:00Z'),
      sender: { id: 'u-spammer', fullName: 'Spammer' },
      conversation: { id: 'conv-1', name: null, type: 'COMMUNITY' },
    },
  });

  it('needs chat.manage', async () => {
    await expect(new ListReportsUseCase(safety).execute('gym-1', {}, member)).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
    await expect(new ResolveReportUseCase(safety, sessions).execute('gym-1', 'msg-1', ReportAction.REMOVE, member)).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('returns a page of reported messages with their full report counts', async () => {
    const message = (id: string) => ({ ...row('1', id, 'x').message });
    safety.openReportQueue.mockResolvedValue({
      groups: [
        { messageId: 'msg-1', _count: { _all: 250 }, _max: { createdAt: new Date('2026-11-27T03:00:00Z') } },
        { messageId: 'msg-2', _count: { _all: 1 }, _max: { createdAt: new Date('2026-11-27T02:00:00Z') } },
      ],
      totalMessages: 41,
      messages: [message('msg-2'), message('msg-1')],
      reports: [
        { messageId: 'msg-1', reason: 'SPAM', note: null, createdAt: new Date(), reporter: { id: 'a', fullName: 'a' } },
        { messageId: 'msg-2', reason: 'HATE', note: 'x', createdAt: new Date(), reporter: { id: 'b', fullName: 'b' } },
      ],
    } as never);
    const queue = await new ListReportsUseCase(safety).execute('gym-1', { page: 2, limit: 20 }, moderator);
    expect(safety.openReportQueue).toHaveBeenCalledWith('gym-1', { skip: 20, take: 20 });
    expect(queue.data.map((item) => [item.messageId, item.reportCount])).toEqual([
      ['msg-1', 250],
      ['msg-2', 1],
    ]);
    expect(queue.data[1].reports.map((report) => report.reporter.id)).toEqual(['b']);
    expect(queue.meta).toEqual({ total: 41, page: 2, limit: 20, totalPages: 3 });
  });

  it('removes a reported message, closes its reports and tells open chats', async () => {
    safety.findMessageInGym.mockResolvedValue(communityMessage);
    safety.removeReportedMessage.mockResolvedValue(2);
    await expect(new ResolveReportUseCase(safety, sessions).execute('gym-1', 'msg-1', ReportAction.REMOVE, moderator)).resolves.toEqual({
      ok: true,
      status: 'REMOVED',
      reportsClosed: 2,
    });
    // One transaction removes the message and closes the reports.
    expect(safety.removeReportedMessage).toHaveBeenCalledWith('gym-1', 'msg-1', 'u-staff');
    expect(safety.resolveReports).not.toHaveBeenCalled();
    expect(sessions.announceMessageDeleted).toHaveBeenCalledWith('conv-1', 'msg-1');
  });

  it('does not announce a removal that closed nothing', async () => {
    safety.findMessageInGym.mockResolvedValue(communityMessage);
    safety.removeReportedMessage.mockResolvedValue(0);
    await expect(new ResolveReportUseCase(safety, sessions).execute('gym-1', 'msg-1', ReportAction.REMOVE, moderator)).rejects.toMatchObject({
      code: 'REPORT_NOT_FOUND',
    });
    expect(sessions.announceMessageDeleted).not.toHaveBeenCalled();
  });

  it('dismissing keeps the message', async () => {
    safety.findMessageInGym.mockResolvedValue(communityMessage);
    safety.resolveReports.mockResolvedValue(1);
    await new ResolveReportUseCase(safety, sessions).execute('gym-1', 'msg-1', ReportAction.DISMISS, moderator);
    expect(safety.resolveReports).toHaveBeenCalledWith('gym-1', 'msg-1', 'DISMISSED', 'u-staff');
    expect(safety.removeReportedMessage).not.toHaveBeenCalled();
    expect(sessions.announceMessageDeleted).not.toHaveBeenCalled();
  });

  it('404s when there is nothing open to resolve (or the message is from another gym)', async () => {
    safety.findMessageInGym.mockResolvedValueOnce(null);
    await expect(new ResolveReportUseCase(safety, sessions).execute('gym-1', 'msg-1', ReportAction.DISMISS, moderator)).rejects.toMatchObject({
      code: 'MESSAGE_NOT_FOUND',
    });
    safety.findMessageInGym.mockResolvedValueOnce(communityMessage);
    safety.resolveReports.mockResolvedValueOnce(0);
    await expect(new ResolveReportUseCase(safety, sessions).execute('gym-1', 'msg-1', ReportAction.DISMISS, moderator)).rejects.toMatchObject({
      code: 'REPORT_NOT_FOUND',
    });
  });
});
