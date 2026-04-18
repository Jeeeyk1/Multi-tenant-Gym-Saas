import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { InvalidCredentialsError } from '../../domain/errors/invalid-credentials.error';
import { IdentityRepository } from '../../infrastructure/persistence/identity.repository';
import type { OrgAuthUser } from '../../../../common/types/auth.types';

export interface OrgLoginResult {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; fullName: string };
}

@Injectable()
export class OrgLoginUseCase {
  constructor(
    private readonly repo: IdentityRepository,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async execute(
    orgSlug: string,
    email: string,
    password: string,
  ): Promise<OrgLoginResult> {
    const org = await this.repo.findOrgBySlug(orgSlug);
    if (!org) throw new InvalidCredentialsError();

    const user = await this.repo.findUserByEmail(email);
    if (!user || !user.isActive || !user.emailVerifiedAt || !user.passwordHash) {
      throw new InvalidCredentialsError();
    }

    const member = await this.repo.findOrgMember(user.id, org.id);
    if (!member) throw new InvalidCredentialsError();

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) throw new InvalidCredentialsError();

    const payload: OrgAuthUser = {
      sub: user.id,
      type: 'org',
      organizationId: org.id,
      orgRole: member.role as OrgAuthUser['orgRole'],
    };

    const accessToken = this.jwt.sign(payload);

    const { raw, hash } = this.repo.generateRefreshTokenPair();
    const refreshExpiresIn = this.config.getOrThrow<string>('jwt.refreshExpiresIn');
    const expiresAt = this.parseExpiresIn(refreshExpiresIn);

    await this.repo.saveRefreshToken(user.id, hash, expiresAt, {
      type: 'org',
      organizationId: org.id,
    });

    return {
      accessToken,
      refreshToken: raw,
      user: { id: user.id, email: user.email, fullName: user.fullName },
    };
  }

  private parseExpiresIn(expiresIn: string): Date {
    const unit = expiresIn.slice(-1);
    const value = parseInt(expiresIn.slice(0, -1), 10);
    const ms =
      unit === 'd' ? value * 86400000
      : unit === 'h' ? value * 3600000
      : unit === 'm' ? value * 60000
      : value * 1000;
    return new Date(Date.now() + ms);
  }
}
