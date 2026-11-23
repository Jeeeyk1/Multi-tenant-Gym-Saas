import type { ExecutionContext } from '@nestjs/common';
import { MemberSelfGuard } from './member-self.guard';
import { ForbiddenError, NotFoundError } from '../errors';

function ctx(user: unknown, params = { gymId: 'g1', memberId: 'm1' }): ExecutionContext {
  const req = { params, user, method: 'GET' };
  return { switchToHttp: () => ({ getRequest: () => req }) } as unknown as ExecutionContext;
}

const gymUser = (sub: string, permissions: string[] = []) => ({
  sub,
  type: 'gym',
  gymId: 'g1',
  roles: [],
  permissions,
});

describe('MemberSelfGuard', () => {
  let guard: MemberSelfGuard;
  let findFirst: jest.Mock;

  beforeEach(() => {
    findFirst = jest.fn().mockResolvedValue({ userId: 'u-owner' });
    guard = new MemberSelfGuard({ gymMember: { findFirst } } as never);
  });

  it('allows the member themself', async () => {
    await expect(guard.canActivate(ctx(gymUser('u-owner')))).resolves.toBe(true);
    expect(findFirst).toHaveBeenCalledWith({ where: { id: 'm1', gymId: 'g1' }, select: { userId: true } });
  });

  it('refuses staff, even with member permissions', async () => {
    await expect(
      guard.canActivate(ctx(gymUser('u-staff', ['members.view', 'members.edit']))),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('refuses org tokens', async () => {
    await expect(guard.canActivate(ctx({ sub: 'u-owner', type: 'org' }))).rejects.toBeInstanceOf(ForbiddenError);
    expect(findFirst).not.toHaveBeenCalled();
  });

  it('404s when the member is not in this gym', async () => {
    findFirst.mockResolvedValue(null);
    await expect(guard.canActivate(ctx(gymUser('u-owner')))).rejects.toBeInstanceOf(NotFoundError);
  });
});
