import { Injectable } from '@nestjs/common';
import { MembersRepository } from '../../infrastructure/persistence/members.repository';
import { parseMemberSpreadsheet } from '../bulk-invite/spreadsheet-parser';
import { BulkInvitePreview, BulkInviteRowResult, EMAIL_RE } from '../bulk-invite/bulk-invite.types';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { assertPermission } from '../../../../common/auth/authorization';
import { Permission } from '../../../../common/enums';

/**
 * Parses an uploaded member spreadsheet and returns a preview classifying each row
 * as ready / skipped / invalid. Writes nothing — this is the "review before send" step.
 */
@Injectable()
export class ValidateBulkInviteUseCase {
  constructor(private readonly repo: MembersRepository) {}

  async execute(gymId: string, buffer: Buffer, caller: AuthenticatedUser): Promise<BulkInvitePreview> {
    assertPermission(caller, Permission.MEMBERS_CREATE);

    const parsed = parseMemberSpreadsheet(buffer);

    const candidateEmails = [...new Set(parsed.filter((r) => EMAIL_RE.test(r.email)).map((r) => r.email))];
    const existing = candidateEmails.length ? await this.repo.findExistingEmails(candidateEmails) : new Set<string>();

    const seenInFile = new Set<string>();
    const rows: BulkInviteRowResult[] = parsed.map((row) => {
      if (!row.email || !EMAIL_RE.test(row.email)) {
        return { ...row, status: 'invalid', reason: 'Missing or invalid email' };
      }
      if (!row.fullName) {
        return { ...row, status: 'invalid', reason: 'Missing name' };
      }
      if (!row.expiryDate) {
        return { ...row, status: 'invalid', reason: 'Missing or unrecognized expiry date' };
      }
      if (seenInFile.has(row.email)) {
        return { ...row, status: 'duplicate_in_file', reason: 'Email appears more than once in the file' };
      }
      seenInFile.add(row.email);
      if (existing.has(row.email)) {
        return { ...row, status: 'already_registered', reason: 'A member with this email already exists' };
      }
      return { ...row, status: 'ready' };
    });

    return {
      rows,
      summary: {
        total: rows.length,
        ready: rows.filter((r) => r.status === 'ready').length,
        skipped: rows.filter((r) => r.status === 'duplicate_in_file' || r.status === 'already_registered').length,
        invalid: rows.filter((r) => r.status === 'invalid').length,
      },
    };
  }
}
