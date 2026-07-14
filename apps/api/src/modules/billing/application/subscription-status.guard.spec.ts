import { SubscriptionStatusGuard } from './subscription-status.guard';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { JwtService } from '@nestjs/jwt';
import type { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../../../common/prisma/prisma.service';
import type { CacheService } from '../../../common/cache/cache.service';
import { SubscriptionStatus } from '../../../common/enums';

function makeContext(authorization?: string): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ headers: { authorization } }) }),
  } as unknown as ExecutionContext;
}

describe('SubscriptionStatusGuard', () => {
  let reflector: jest.Mocked<Reflector>;
  let jwt: jest.Mocked<JwtService>;
  let cache: jest.Mocked<CacheService>;
  let guard: SubscriptionStatusGuard;

  const config = { getOrThrow: () => 'secret' } as unknown as ConfigService;
  const prisma = {} as unknown as PrismaService;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) } as unknown as jest.Mocked<Reflector>;
    jwt = { verify: jest.fn() } as unknown as jest.Mocked<JwtService>;
    cache = { wrap: jest.fn() } as unknown as jest.Mocked<CacheService>;
    guard = new SubscriptionStatusGuard(reflector, jwt, config, prisma, cache);
  });

  it('allows @AllowInactiveSubscription routes without decoding a token', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    await expect(guard.canActivate(makeContext('Bearer x'))).resolves.toBe(true);
    expect(jwt.verify).not.toHaveBeenCalled();
  });

  it('allows requests with no token (auth guard will handle it)', async () => {
    await expect(guard.canActivate(makeContext(undefined))).resolves.toBe(true);
  });

  it('allows non-gym tokens (org/admin not gated here)', async () => {
    jwt.verify.mockReturnValue({ type: 'org', organizationId: 'o1' } as never);
    await expect(guard.canActivate(makeContext('Bearer t'))).resolves.toBe(true);
    expect(cache.wrap).not.toHaveBeenCalled();
  });

  it('allows an ACTIVE gym', async () => {
    jwt.verify.mockReturnValue({ type: 'gym', gymId: 'gym-1' } as never);
    cache.wrap.mockResolvedValue(SubscriptionStatus.ACTIVE as never);
    await expect(guard.canActivate(makeContext('Bearer t'))).resolves.toBe(true);
  });

  it('allows a PAST_DUE gym (grace window)', async () => {
    jwt.verify.mockReturnValue({ type: 'gym', gymId: 'gym-1' } as never);
    cache.wrap.mockResolvedValue(SubscriptionStatus.PAST_DUE as never);
    await expect(guard.canActivate(makeContext('Bearer t'))).resolves.toBe(true);
  });

  it('blocks a PENDING_PAYMENT gym with 402', async () => {
    jwt.verify.mockReturnValue({ type: 'gym', gymId: 'gym-1' } as never);
    cache.wrap.mockResolvedValue(SubscriptionStatus.PENDING_PAYMENT as never);
    await expect(guard.canActivate(makeContext('Bearer t'))).rejects.toMatchObject({
      statusCode: 402,
      code: 'SUBSCRIPTION_INACTIVE',
    });
  });

  it('allows a gym with no subscription (legacy / pre-billing)', async () => {
    jwt.verify.mockReturnValue({ type: 'gym', gymId: 'gym-1' } as never);
    cache.wrap.mockResolvedValue('NONE' as never);
    await expect(guard.canActivate(makeContext('Bearer t'))).resolves.toBe(true);
  });
});
