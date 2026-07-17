import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { ForbiddenError } from '../errors';

interface DecodedToken {
  type?: string;
  gymId?: string;
  organizationId?: string;
}

// A gym never changes organization, so this mapping is effectively immutable —
// cache it long enough to keep the org-token path off the DB on the hot path.
const GYM_ORG_TTL_SECONDS = 300;

/**
 * Global guard enforcing multi-tenant isolation on every gym-scoped route
 * (any route carrying a `:gymId` param). It decodes the JWT itself, so it needs
 * no per-controller wiring and does not depend on JwtAuthGuard having run first.
 *
 * - gym token    → the token's gymId must equal the `:gymId` in the URL.
 * - org token    → the `:gymId` must belong to the caller's organization.
 * - system_admin → allowed (platform-wide access).
 * - no `:gymId` param, or no/invalid token → pass through (the route isn't
 *   gym-scoped, or JwtAuthGuard will reject the request with 401).
 *
 * This makes tenant isolation a property of the route rather than something each
 * use case must remember to enforce with assertGymAccess (which is kept as
 * defense-in-depth). In particular it closes the org-token bypass, where an
 * organization token slipped past the per-use-case checks that only guarded
 * `type === 'gym'`.
 */
@Injectable()
export class GymAccessGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const gymId = request.params?.gymId;
    if (!gymId) return true; // not a gym-scoped route

    const user = this.decode(request);
    if (!user) return true; // no/invalid token — let JwtAuthGuard return 401

    switch (user.type) {
      case 'gym':
        if (user.gymId !== gymId) throw denied();
        return true;

      case 'org': {
        if (!user.organizationId) throw denied();
        const ownerOrg = await this.cache.wrap(`gym:org:${gymId}`, GYM_ORG_TTL_SECONDS, () =>
          this.loadGymOrg(gymId),
        );
        if (ownerOrg !== user.organizationId) throw denied();
        return true;
      }

      case 'system_admin':
        return true;

      default:
        // Unknown token shape — deny rather than risk a leak.
        throw denied();
    }
  }

  private decode(request: Request): DecodedToken | null {
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) return null;
    try {
      const secret = this.config.getOrThrow<string>('jwt.accessSecret');
      return this.jwt.verify<DecodedToken>(token, { secret });
    } catch {
      return null;
    }
  }

  /** Returns the owning organizationId, or '' when the gym does not exist (denied). */
  private async loadGymOrg(gymId: string): Promise<string> {
    const gym = await this.prisma.gym.findUnique({
      where: { id: gymId },
      select: { organizationId: true },
    });
    return gym?.organizationId ?? '';
  }
}

function denied(): ForbiddenError {
  return new ForbiddenError('Access denied to this gym', 'GYM_ACCESS_DENIED');
}
