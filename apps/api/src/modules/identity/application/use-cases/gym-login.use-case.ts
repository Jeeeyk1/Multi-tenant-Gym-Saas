import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { InvalidCredentialsError } from '../../domain/errors/invalid-credentials.error';
import { IdentityRepository } from '../../infrastructure/persistence/identity.repository';
import type { GymAuthUser } from '../../../../common/types/auth.types';
import { gymClaims } from '../../domain/gym-claims';

export interface GymLoginResult {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; fullName: string };
}

@Injectable()
export class GymLoginUseCase {
  constructor(
    private readonly repo: IdentityRepository,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async execute(
    gymCode: string,
    email: string,
    password: string,
  ): Promise<GymLoginResult> {
    const gym = await this.repo.findGymByCode(gymCode);
    if (!gym) throw new InvalidCredentialsError();

    const user = await this.repo.findUserByEmail(email);
    if (!user || !user.isActive || !user.emailVerifiedAt || !user.passwordHash) {
      throw new InvalidCredentialsError();
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) throw new InvalidCredentialsError();

    // Staff, a member, or both (e.g. a trainer who also trains here).
    const [staff, member] = await Promise.all([
      this.repo.findGymStaffWithPermissions(user.id, gym.id),
      this.repo.findGymMember(user.id, gym.id),
    ]);
    const claims = gymClaims(staff, Boolean(member));
    if (!claims) throw new InvalidCredentialsError();

    const payload: GymAuthUser = { sub: user.id, type: 'gym', gymId: gym.id, ...claims };

    const accessToken = this.jwt.sign(payload);

    const { raw, hash } = this.repo.generateRefreshTokenPair();
    const refreshExpiresIn = this.config.getOrThrow<string>('jwt.refreshExpiresIn');
    const expiresAt = this.parseExpiresIn(refreshExpiresIn);

    await this.repo.saveRefreshToken(user.id, hash, expiresAt, {
      type: 'gym',
      gymId: gym.id,
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
