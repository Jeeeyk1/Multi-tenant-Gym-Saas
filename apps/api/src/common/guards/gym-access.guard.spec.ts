import type { ExecutionContext } from '@nestjs/common';
import { GymAccessGuard } from './gym-access.guard';
import { ForbiddenError } from '../errors';

/** Build a minimal ExecutionContext with the given route params + auth header. */
function ctx(params: Record<string, string>, authorization?: string): ExecutionContext {
  const req = { params, headers: authorization ? { authorization } : {} };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

describe('GymAccessGuard', () => {
  let guard: GymAccessGuard;
  let verify: jest.Mock;
  let findUnique: jest.Mock;

  beforeEach(() => {
    verify = jest.fn();
    findUnique = jest.fn();
    const jwt = { verify } as never;
    const config = { getOrThrow: () => 'secret' } as never;
    const prisma = { gym: { findUnique } } as never;
    // wrap just runs the compute fn so the prisma lookup is exercised.
    const cache = { wrap: (_k: string, _ttl: number, fn: () => unknown) => fn() } as never;
    guard = new GymAccessGuard(jwt, config, prisma, cache);
  });

  const AUTH = 'Bearer token';

  it('passes through routes with no :gymId param (not gym-scoped)', async () => {
    await expect(guard.canActivate(ctx({}, AUTH))).resolves.toBe(true);
    expect(verify).not.toHaveBeenCalled();
  });

  it('passes through when there is no token (lets JwtAuthGuard 401)', async () => {
    await expect(guard.canActivate(ctx({ gymId: 'g1' }))).resolves.toBe(true);
  });

  it('passes through when the token is invalid (lets JwtAuthGuard 401)', async () => {
    verify.mockImplementation(() => {
      throw new Error('bad token');
    });
    await expect(guard.canActivate(ctx({ gymId: 'g1' }, AUTH))).resolves.toBe(true);
  });

  it('allows a gym token whose gymId matches the route', async () => {
    verify.mockReturnValue({ type: 'gym', gymId: 'g1' });
    await expect(guard.canActivate(ctx({ gymId: 'g1' }, AUTH))).resolves.toBe(true);
  });

  it('denies a gym token whose gymId does NOT match the route', async () => {
    verify.mockReturnValue({ type: 'gym', gymId: 'g1' });
    await expect(guard.canActivate(ctx({ gymId: 'g2' }, AUTH))).rejects.toThrow(ForbiddenError);
  });

  it('allows an org token when the gym belongs to its organization', async () => {
    verify.mockReturnValue({ type: 'org', organizationId: 'org1' });
    findUnique.mockResolvedValue({ organizationId: 'org1' });
    await expect(guard.canActivate(ctx({ gymId: 'g1' }, AUTH))).resolves.toBe(true);
  });

  it('denies an org token when the gym belongs to a different organization', async () => {
    verify.mockReturnValue({ type: 'org', organizationId: 'org1' });
    findUnique.mockResolvedValue({ organizationId: 'org2' });
    await expect(guard.canActivate(ctx({ gymId: 'g1' }, AUTH))).rejects.toThrow(ForbiddenError);
  });

  it('denies an org token when the gym does not exist', async () => {
    verify.mockReturnValue({ type: 'org', organizationId: 'org1' });
    findUnique.mockResolvedValue(null);
    await expect(guard.canActivate(ctx({ gymId: 'ghost' }, AUTH))).rejects.toThrow(ForbiddenError);
  });

  it('allows a system_admin token', async () => {
    verify.mockReturnValue({ type: 'system_admin' });
    await expect(guard.canActivate(ctx({ gymId: 'g1' }, AUTH))).resolves.toBe(true);
  });

  it('denies an unknown token shape rather than leaking', async () => {
    verify.mockReturnValue({ type: 'weird' });
    await expect(guard.canActivate(ctx({ gymId: 'g1' }, AUTH))).rejects.toThrow(ForbiddenError);
  });
});
