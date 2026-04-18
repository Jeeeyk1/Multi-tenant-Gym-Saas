import { Injectable } from '@nestjs/common';
import { IdentityRepository } from '../../infrastructure/persistence/identity.repository';

@Injectable()
export class LogoutUseCase {
  constructor(private readonly repo: IdentityRepository) {}

  /**
   * Revokes the refresh token. Idempotent — no error if token not found or already revoked.
   */
  async execute(rawToken: string): Promise<void> {
    const tokenHash = this.repo.hashToken(rawToken);
    await this.repo.revokeRefreshToken(tokenHash);
  }
}
