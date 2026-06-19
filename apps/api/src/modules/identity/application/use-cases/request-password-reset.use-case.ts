import { Injectable } from '@nestjs/common';
import { EmailService } from '../../../../common/email/email.service';
import { IdentityRepository } from '../../infrastructure/persistence/identity.repository';

@Injectable()
export class RequestPasswordResetUseCase {
  constructor(
    private readonly repo: IdentityRepository,
    private readonly email: EmailService,
  ) {}

  async execute(email: string): Promise<void> {
    const user = await this.repo.findUserByEmail(email);

    // Always return 200 regardless — prevents email enumeration.
    if (!user || !user.emailVerifiedAt) return;

    const resetToken = await this.repo.createPasswordResetToken(user.id);

    await this.email.sendPasswordReset({
      to: user.email,
      fullName: user.fullName,
      token: resetToken,
    });
  }
}
