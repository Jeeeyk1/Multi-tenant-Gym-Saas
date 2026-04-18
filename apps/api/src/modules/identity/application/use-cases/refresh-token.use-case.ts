import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TokenInvalidError } from '../../domain/errors/token-invalid.error';
import { IdentityRepository, RefreshTokenContext } from '../../infrastructure/persistence/identity.repository';
import type { OrgAuthUser, GymAuthUser } from '../../../../common/types/auth.types';

export interface RefreshTokenResult {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    private readonly repo: IdentityRepository,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async execute(rawToken: string): Promise<RefreshTokenResult> {
    const tokenHash = this.repo.hashToken(rawToken);
    const stored = await this.repo.findRefreshToken(tokenHash);
    if (!stored) throw new TokenInvalidError();

    const context = stored.deviceInfo as unknown as RefreshTokenContext;

    // Re-build the JWT payload from context
    let payload: OrgAuthUser | GymAuthUser;

    if (context.type === 'org' && context.organizationId) {
      const member = await this.repo.findOrgMember(stored.userId, context.organizationId);
      if (!member) throw new TokenInvalidError();

      payload = {
        sub: stored.userId,
        type: 'org',
        organizationId: context.organizationId,
        orgRole: member.role as OrgAuthUser['orgRole'],
      };
    } else if (context.type === 'gym' && context.gymId) {
      const staff = await this.repo.findGymStaffWithPermissions(stored.userId, context.gymId);

      if (staff) {
        const roleNames = staff.roles.map((sr) => sr.role.name);
        const permissions: string[] = [
          ...new Set(
            staff.roles.flatMap((sr) =>
              sr.role.rolePermissions.map((rp) => rp.permission.key),
            ),
          ),
        ];
        payload = {
          sub: stored.userId,
          type: 'gym',
          gymId: context.gymId,
          roles: roleNames,
          permissions,
        };
      } else {
        payload = {
          sub: stored.userId,
          type: 'gym',
          gymId: context.gymId,
          roles: ['MEMBER'],
          permissions: ['checkins.self', 'announcements.view'],
        };
      }
    } else {
      throw new TokenInvalidError();
    }

    // Rotate: revoke old token, issue new pair
    await this.repo.revokeRefreshTokenById(stored.id);

    const accessToken = this.jwt.sign(payload);
    const { raw, hash } = this.repo.generateRefreshTokenPair();
    const refreshExpiresIn = this.config.getOrThrow<string>('jwt.refreshExpiresIn');
    const expiresAt = this.parseExpiresIn(refreshExpiresIn);

    await this.repo.saveRefreshToken(stored.userId, hash, expiresAt, context);

    return { accessToken, refreshToken: raw };
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
