import { Inject, Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ForbiddenError, NotFoundError, TooManyRequestsError } from '../../../../common/errors';
import { assertGymAccess } from '../../../../common/auth/authorization';
import { MemberStatus } from '../../../../common/enums';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { RateLimiterService } from '../../../../common/rate-limiter/rate-limiter.service';
import { STORAGE_PORT, type StoragePort } from '../../../../common/adapters/storage/storage.port';
import { MembersRepository } from '../../infrastructure/persistence/members.repository';
import { CacheService } from '../../../../common/cache/cache.service';
import { ChatSessionsService } from '../../../chat/application/chat-sessions.service';
import { leaderboardCacheKey } from '../../../leaderboard/application/leaderboard-cache';

// Password attempts per person, so this can't be used to guess a password.
const ATTEMPT_LIMIT = 5;
const ATTEMPT_WINDOW_SECONDS = 15 * 60;

export interface DeleteMyAccountResult {
  /** False when the login stays (the person is also staff, an owner, or a member elsewhere). */
  loginDeleted: boolean;
}

/**
 * A member deletes their own account (App Store / Play requirement). Their personal, health and
 * chat data is deleted; renewals and check-ins stay without a name for the gym's records. Only
 * the member side goes: a staff or owner login stays until the owner removes it.
 */
@Injectable()
export class DeleteMyAccountUseCase {
  private readonly logger = new Logger(DeleteMyAccountUseCase.name);

  constructor(
    private readonly repo: MembersRepository,
    private readonly rateLimiter: RateLimiterService,
    @Inject(STORAGE_PORT) private readonly storage: StoragePort,
    private readonly cache: CacheService,
    private readonly chatSessions: ChatSessionsService,
  ) {}

  async execute(gymId: string, password: string, caller: AuthenticatedUser): Promise<DeleteMyAccountResult> {
    assertGymAccess(caller, gymId);

    const allowed = await this.rateLimiter.hit(`members:delete-account:${caller.sub}`, ATTEMPT_LIMIT, ATTEMPT_WINDOW_SECONDS);
    if (!allowed) throw new TooManyRequestsError('Too many attempts. Please try again in a few minutes.', 'RATE_LIMITED');

    const member = await this.repo.findMemberForDeletion(gymId, caller.sub);
    if (!member || member.status === MemberStatus.DELETED) {
      throw new NotFoundError('Member record not found', 'MEMBER_NOT_FOUND');
    }

    const passwordOk = member.passwordHash !== null && (await bcrypt.compare(password, member.passwordHash));
    if (!passwordOk) {
      this.logger.warn(`account deletion refused: wrong password gym=${gymId} user=${caller.sub}`);
      throw new ForbiddenError('That password is not right.', 'INVALID_PASSWORD');
    }

    const anonymiseLogin = !member.keepsLogin;
    const result = await this.repo.anonymiseMember(member.memberId, caller.sub, {
      gymId,
      anonymiseLogin,
      isStaffHere: member.isStaffHere,
    });
    if (!result) throw new NotFoundError('Member record not found', 'MEMBER_NOT_FOUND');
    this.logger.log(
      `account deleted gym=${gymId} member=${member.memberId} user=${caller.sub} loginDeleted=${anonymiseLogin} photos=${result.photoUrls.length}`,
    );

    // After the commit, and best effort: a leftover image or cache entry is better than an account
    // that can't be deleted. An open chat socket would otherwise keep receiving until it reconnects.
    await Promise.all([
      ...result.photoUrls.map((url) => this.deletePhoto(url, gymId, member.memberId)),
      this.cache.del(leaderboardCacheKey(gymId)),
      member.isStaffHere ? Promise.resolve() : this.endChatSessions(gymId, caller.sub),
    ]);
    return { loginDeleted: anonymiseLogin };
  }

  private async endChatSessions(gymId: string, userId: string): Promise<void> {
    try {
      await this.chatSessions.disconnectUser(gymId, userId);
    } catch (err) {
      this.logger.error(`chat sessions not ended user=${userId}`, err instanceof Error ? err.stack : String(err));
    }
  }

  private async deletePhoto(url: string, gymId: string, memberId: string): Promise<void> {
    // Only the folders this member's uploads go to (see upload-food-photo and upload-pr-photo).
    const folders = [`members/${memberId}`, `gyms/${gymId}/leaderboard`];
    try {
      const deleted = await this.storage.deleteImageByUrl(url, folders);
      if (!deleted) this.logger.warn(`photo left in place (not in this member's folders, or already gone) member=${memberId}`);
    } catch (err) {
      this.logger.error(`photo not deleted member=${memberId}`, err instanceof Error ? err.stack : String(err));
    }
  }
}
