import { SendMemberInvitesJob } from './send-member-invites.job';
import type { CronLockService } from '../shared/cron-lock.service';
import type { MembersRepository } from '../../modules/members/infrastructure/persistence/members.repository';
import type { EmailService } from '../../common/email/email.service';

function makeLock(acquired = true): jest.Mocked<CronLockService> {
  return {
    withLock: jest.fn(async (_key, _ttl, fn) => {
      if (acquired) await fn();
    }),
  } as unknown as jest.Mocked<CronLockService>;
}

const members = {
  listPendingInvites: jest.fn(),
  markInviteSent: jest.fn(),
  markInviteFailed: jest.fn(),
} as unknown as jest.Mocked<MembersRepository>;

const email = { sendMemberInvite: jest.fn().mockResolvedValue(true) } as unknown as jest.Mocked<EmailService>;

function invite(id: string, over: Record<string, unknown> = {}) {
  return { id, email: `${id}@x.com`, fullName: id, token: `tok-${id}`, gym: { name: 'Iron', code: 'IRON' }, ...over };
}

describe('SendMemberInvitesJob', () => {
  let job: SendMemberInvitesJob;

  beforeEach(() => {
    jest.clearAllMocks();
    email.sendMemberInvite.mockResolvedValue(true);
    job = new SendMemberInvitesJob(members, email, makeLock());
  });

  it('sends each pending invite and marks it sent', async () => {
    members.listPendingInvites.mockResolvedValue([invite('a'), invite('b')] as never);

    await job.run();

    expect(email.sendMemberInvite).toHaveBeenCalledTimes(2);
    expect(email.sendMemberInvite).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'a@x.com', gymName: 'Iron', gymCode: 'IRON', token: 'tok-a' }),
    );
    expect(members.markInviteSent).toHaveBeenCalledWith('a');
    expect(members.markInviteSent).toHaveBeenCalledWith('b');
  });

  it('marks an invite failed (for retry) when the email send throws', async () => {
    members.listPendingInvites.mockResolvedValue([invite('a')] as never);
    email.sendMemberInvite.mockRejectedValueOnce(new Error('rate limited'));

    await job.run();

    expect(members.markInviteFailed).toHaveBeenCalledWith('a');
    expect(members.markInviteSent).not.toHaveBeenCalled();
  });

  it('marks an invite failed when the email service reports a failure', async () => {
    members.listPendingInvites.mockResolvedValue([invite('a')] as never);
    email.sendMemberInvite.mockResolvedValueOnce(false);

    await job.run();

    expect(members.markInviteFailed).toHaveBeenCalledWith('a');
    expect(members.markInviteSent).not.toHaveBeenCalled();
  });

  it('does nothing when there are no pending invites', async () => {
    members.listPendingInvites.mockResolvedValue([] as never);
    await job.run();
    expect(email.sendMemberInvite).not.toHaveBeenCalled();
  });
});
