import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CronLockService } from '../shared/cron-lock.service';
import { CRON_LOCK_TTL, CRON_SCHEDULE } from '../../config/cron.config';
import { MembersRepository } from '../../modules/members/infrastructure/persistence/members.repository';
import { EmailService } from '../../common/email/email.service';

const LOCK_KEY = 'lock:cron:send-member-invites';
const BATCH_SIZE = 25; // per tick — keeps under the email provider's rate limits
const MAX_ATTEMPTS = 5;

/**
 * Drains the member-invite outbox (populated by bulk import) in small batches so
 * hundreds of invite emails don't block the request or trip the provider's rate
 * limits. Failed sends are retried on later ticks up to MAX_ATTEMPTS.
 */
@Injectable()
export class SendMemberInvitesJob {
  private readonly logger = new Logger(SendMemberInvitesJob.name);

  constructor(
    private readonly members: MembersRepository,
    private readonly email: EmailService,
    private readonly lock: CronLockService,
  ) {}

  @Cron(CRON_SCHEDULE.MEMBER_INVITE_SEND)
  async run(): Promise<void> {
    await this.lock.withLock(LOCK_KEY, CRON_LOCK_TTL.MEMBER_INVITE_SEND, async () => {
      const pending = await this.members.listPendingInvites(BATCH_SIZE, MAX_ATTEMPTS);
      if (pending.length === 0) return;

      const start = Date.now();
      let sent = 0;

      for (const invite of pending) {
        try {
          const delivered = await this.email.sendMemberInvite({
            to: invite.email,
            fullName: invite.fullName,
            gymName: invite.gym.name,
            gymCode: invite.gym.code,
            gymLogoUrl: invite.gym.profile?.logoUrl,
            gymAccent: invite.gym.profile?.primaryColor,
            token: invite.token,
          });
          if (!delivered) {
            await this.members.markInviteFailed(invite.id);
            continue;
          }
          await this.members.markInviteSent(invite.id);
          sent++;
        } catch (err) {
          await this.members.markInviteFailed(invite.id);
          this.logger.warn(`invite send failed for ${invite.email}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      this.logger.log(`sent ${sent}/${pending.length} member invites in ${Date.now() - start}ms`);
    });
  }
}
