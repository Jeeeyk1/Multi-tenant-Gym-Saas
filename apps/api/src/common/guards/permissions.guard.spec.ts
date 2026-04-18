import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import type { ExecutionContext } from '@nestjs/common';
import type { GymAuthUser, OrgAuthUser } from '../types/auth.types';

const gymUser: GymAuthUser = {
  sub: 'user-1',
  type: 'gym',
  gymId: 'gym-1',
  roles: ['MANAGER'],
  permissions: ['members.view', 'members.create'],
};

const orgUser: OrgAuthUser = {
  sub: 'user-2',
  type: 'org',
  organizationId: 'org-1',
  orgRole: 'OWNER',
};

function buildContext(
  user: GymAuthUser | OrgAuthUser | undefined,
  requiredPermissions: string[],
): ExecutionContext {
  const reflector = new Reflector();
  jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredPermissions);

  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: jest.fn(),
    getClass: jest.fn(),
    reflector,
  } as unknown as ExecutionContext;
}

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new PermissionsGuard(reflector);
  });

  it('allows access when no permissions are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);
    const ctx = {
      switchToHttp: () => ({ getRequest: () => ({ user: gymUser }) }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows access when all required permissions are present', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['members.view']);
    const ctx = {
      switchToHttp: () => ({ getRequest: () => ({ user: gymUser }) }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('denies access when a required permission is missing', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['staff.manage']);
    const ctx = {
      switchToHttp: () => ({ getRequest: () => ({ user: gymUser }) }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;
    expect(guard.canActivate(ctx)).toBe(false);
  });

  it('denies access for org-level token on a permissioned route', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['members.view']);
    const ctx = {
      switchToHttp: () => ({ getRequest: () => ({ user: orgUser }) }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;
    expect(guard.canActivate(ctx)).toBe(false);
  });

  it('denies access when user is undefined', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['members.view']);
    const ctx = {
      switchToHttp: () => ({ getRequest: () => ({ user: undefined }) }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;
    expect(guard.canActivate(ctx)).toBe(false);
  });

  it('requires ALL permissions (AND logic)', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['members.view', 'staff.manage']);
    const ctx = {
      switchToHttp: () => ({ getRequest: () => ({ user: gymUser }) }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;
    // gymUser has members.view but not staff.manage
    expect(guard.canActivate(ctx)).toBe(false);
  });
});
