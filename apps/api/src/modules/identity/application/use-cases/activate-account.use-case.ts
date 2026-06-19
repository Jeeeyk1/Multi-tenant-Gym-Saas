import { Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { TokenInvalidError } from '../../domain/errors/token-invalid.error';
import { IdentityRepository } from '../../infrastructure/persistence/identity.repository';
import { EmailService } from '../../../../common/email/email.service';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class ActivateAccountUseCase {
  private readonly logger = new Logger(ActivateAccountUseCase.name);

  constructor(
    private readonly repo: IdentityRepository,
    private readonly email: EmailService,
  ) {}

  async execute(token: string, password: string): Promise<void> {
    const inviteToken = await this.repo.findInviteToken(token);
    if (!inviteToken) throw new TokenInvalidError();

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await this.repo.activateAccount(inviteToken.userId, passwordHash, inviteToken.id);

    if (inviteToken.type === 'INVITE') {
      void this.sendWelcomeEmail(inviteToken.userId);
    }
  }

  private async sendWelcomeEmail(userId: string): Promise<void> {
    try {
      const user = await this.repo.findUserWithFirstGymStaff(userId);
      const gym = user?.gymStaff[0]?.gym;
      if (!user || !gym) return;
      await this.email.sendWelcome({
        to: user.email,
        fullName: user.fullName,
        gymName: gym.name,
        gymCode: gym.code,
      });
    } catch (err) {
      this.logger.error(`Failed to send welcome email for user ${userId}: ${(err as Error).message}`);
    }
  }
}
