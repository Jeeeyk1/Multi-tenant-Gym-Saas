import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { TokenInvalidError } from '../../domain/errors/token-invalid.error';
import { IdentityRepository } from '../../infrastructure/persistence/identity.repository';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class ActivateAccountUseCase {
  constructor(private readonly repo: IdentityRepository) {}

  async execute(token: string, password: string): Promise<void> {
    const inviteToken = await this.repo.findInviteToken(token);
    if (!inviteToken) throw new TokenInvalidError();

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await this.repo.activateAccount(inviteToken.userId, passwordHash, inviteToken.id);
  }
}
