import { Injectable, Logger } from '@nestjs/common';
import { NotFoundError } from '../../../../common/errors';
import { MembersRepository } from '../../infrastructure/persistence/members.repository';
import { EMAIL_RE } from '../bulk-invite/bulk-invite.types';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { assertPermission } from '../../../../common/auth/authorization';
import { Permission } from '../../../../common/enums';

export interface BulkInviteMemberInput {
  email: string;
  fullName: string;
  /** YYYY-MM-DD */
  expiryDate: string;
}

export interface BulkInviteResult {
  created: number;
  skipped: { email: string; reason: string }[];
}

/**
 * Creates the given members synchronously (no email sent here) and enqueues each
 * invite for the async sender cron. Re-validates every row server-side and skips
 * bad/duplicate rows rather than failing the whole batch, so one bad row can't block
 * the rest. Emails go out in the background.
 */
@Injectable()
export class BulkInviteMembersUseCase {
  private readonly logger = new Logger(BulkInviteMembersUseCase.name);

  constructor(private readonly repo: MembersRepository) {}

  async execute(
    gymId: string,
    members: BulkInviteMemberInput[],
    caller: AuthenticatedUser,
  ): Promise<BulkInviteResult> {
    assertPermission(caller, Permission.MEMBERS_CREATE);

    const gym = await this.repo.findGymById(gymId);
    if (!gym) throw new NotFoundError('Gym not found', 'GYM_NOT_FOUND');

    const skipped: BulkInviteResult['skipped'] = [];
    let created = 0;
    const seen = new Set<string>();

    for (const raw of members) {
      const email = raw.email?.trim().toLowerCase() ?? '';
      const fullName = raw.fullName?.trim() ?? '';
      const expiry = new Date(raw.expiryDate);

      // Server-side re-validation — never trust the client's classification.
      if (!EMAIL_RE.test(email)) { skipped.push({ email, reason: 'Invalid email' }); continue; }
      if (!fullName) { skipped.push({ email, reason: 'Missing name' }); continue; }
      if (Number.isNaN(expiry.getTime())) { skipped.push({ email, reason: 'Invalid expiry date' }); continue; }
      if (seen.has(email)) { skipped.push({ email, reason: 'Duplicate in request' }); continue; }
      seen.add(email);

      try {
        await this.repo.bulkCreateMemberWithOutbox({ gymId, email, fullName, expiryDate: expiry });
        created++;
      } catch (err) {
        // Most likely an email taken between validation and now (unique constraint).
        this.logger.warn(`bulk invite skipped ${email}: ${err instanceof Error ? err.message : String(err)}`);
        skipped.push({ email, reason: 'Already registered' });
      }
    }

    return { created, skipped };
  }
}
