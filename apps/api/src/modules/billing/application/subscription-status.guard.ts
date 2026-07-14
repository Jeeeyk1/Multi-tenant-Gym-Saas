import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CacheService } from '../../../common/cache/cache.service';
import { PaymentRequiredError } from '../../../common/errors';
import { SubscriptionStatus } from '../../../common/enums';
import type { AuthenticatedUser } from '../../../common/types/auth.types';
import { ALLOW_INACTIVE_SUBSCRIPTION } from './allow-inactive-subscription.decorator';

// Statuses that lock the gym. PAST_DUE is a grace window (still usable); a gym with no
// subscription at all (legacy / pre-billing) is left open — the lock is for the pay-first flow.
const LOCKED_STATUSES: string[] = [
  SubscriptionStatus.PENDING_PAYMENT,
  SubscriptionStatus.SUSPENDED,
  SubscriptionStatus.CANCELLED,
];
const STATUS_TTL_SECONDS = 30;

/**
 * Global guard. Decodes the JWT itself (so it needs no per-controller wiring) and blocks
 * gym-scoped requests with 402 when the gym's subscription is locked. Non-gym tokens,
 * missing/invalid tokens, and @AllowInactiveSubscription routes pass through.
 */
@Injectable()
export class SubscriptionStatusGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const allowInactive = this.reflector.getAllAndOverride<boolean>(ALLOW_INACTIVE_SUBSCRIPTION, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (allowInactive) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const user = this.decode(request);
    // Only gym-scoped callers are gated here. No/invalid token or org/admin token → let the
    // real auth guard handle it.
    if (!user || user.type !== 'gym') return true;

    const status = await this.cache.wrap(`sub:status:${user.gymId}`, STATUS_TTL_SECONDS, () =>
      this.loadStatus(user.gymId),
    );

    if (LOCKED_STATUSES.includes(status)) {
      throw new PaymentRequiredError('This gym\'s subscription is not active');
    }
    return true;
  }

  private decode(request: Request): AuthenticatedUser | null {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    if (type !== 'Bearer' || !token) return null;
    try {
      const secret = this.config.getOrThrow<string>('jwt.accessSecret');
      return this.jwt.verify<AuthenticatedUser>(token, { secret });
    } catch {
      return null;
    }
  }

  private async loadStatus(gymId: string): Promise<string> {
    const gym = await this.prisma.gym.findUnique({ where: { id: gymId }, select: { organizationId: true } });
    if (!gym) return 'NONE';
    const sub = await this.prisma.subscription.findFirst({
      where: { organizationId: gym.organizationId },
      orderBy: { createdAt: 'desc' },
      select: { status: true },
    });
    return sub?.status ?? 'NONE';
  }
}
