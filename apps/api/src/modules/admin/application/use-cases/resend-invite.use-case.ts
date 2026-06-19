import { Injectable } from '@nestjs/common';
import { EmailService } from '../../../../common/email/email.service';
import { ConflictError, NotFoundError } from '../../../../common/errors';
import { AdminRepository } from '../../infrastructure/persistence/admin.repository';

@Injectable()
export class ResendInviteUseCase {
  constructor(
    private readonly repo: AdminRepository,
    private readonly email: EmailService,
  ) {}

  async execute(gymId: string): Promise<{ inviteToken: string }> {
    const owner = await this.repo.findGymOwnerByGymId(gymId);
    if (!owner) throw new NotFoundError('Gym or gym owner not found');

    if (owner.emailVerifiedAt) {
      throw new ConflictError(
        'This account has already been activated',
        'ACCOUNT_ALREADY_ACTIVATED',
      );
    }

    const inviteToken = await this.repo.resendInviteForGymOwner(owner.id);

    await this.email.sendOwnerInvite({
      to: owner.email,
      fullName: owner.fullName,
      gymName: owner.gymName,
      gymCode: owner.gymCode,
      token: inviteToken,
    });

    return { inviteToken };
  }
}
