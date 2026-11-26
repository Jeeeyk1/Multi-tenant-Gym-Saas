import type { ExecutionContext } from '@nestjs/common';
import { MemberAccessGuard } from './member-access.guard';
import { ForbiddenError, NotFoundError } from '../errors';

function ctx(user: unknown, method = 'GET', params = { gymId: 'g1', memberId: 'm1' }): ExecutionContext {
  const req = { params, user, method };
  return { switchToHttp: () => ({ getRequest: () => req }) } as unknown as ExecutionContext;
}

const gymUser = (sub: string, permissions: string[] = []) => ({
  sub,
  type: 'gym',
  gymId: 'g1',
  roles: [],
  permissions,
});

describe('MemberAccessGuard', () => {
  let guard: MemberAccessGuard;
  let findFirst: jest.Mock;

  beforeEach(() => {
    findFirst = jest.fn().mockResolvedValue({ userId: 'u-owner' });
    guard = new MemberAccessGuard({ gymMember: { findFirst } } as never);
  });

  it('scopes the member lookup to the gym in the URL', async () => {
    await guard.canActivate(ctx(gymUser('u-owner')));
    expect(findFirst).toHaveBeenCalledWith({
      where: { id: 'm1', gymId: 'g1' },
      select: { userId: true, status: true },
    });
  });

  it('404s when the member is not in this gym', async () => {
    findFirst.mockResolvedValue(null);
    await expect(guard.canActivate(ctx(gymUser('u-owner')))).rejects.toBeInstanceOf(NotFoundError);
  });

  it('allows the member themself to read and write', async () => {
    await expect(guard.canActivate(ctx(gymUser('u-owner'), 'GET'))).resolves.toBe(true);
    await expect(guard.canActivate(ctx(gymUser('u-owner'), 'POST'))).resolves.toBe(true);
  });

  it('denies another member of the same gym', async () => {
    const other = gymUser('u-other', ['checkins.self', 'announcements.view']);
    await expect(guard.canActivate(ctx(other, 'GET'))).rejects.toBeInstanceOf(ForbiddenError);
    await expect(guard.canActivate(ctx(other, 'POST'))).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('lets staff with members.details read but not write', async () => {
    const staff = gymUser('u-staff', ['members.details']);
    await expect(guard.canActivate(ctx(staff, 'GET'))).resolves.toBe(true);
    await expect(guard.canActivate(ctx(staff, 'POST'))).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('lets staff with members.edit write', async () => {
    const staff = gymUser('u-staff', ['members.edit']);
    await expect(guard.canActivate(ctx(staff, 'POST'))).resolves.toBe(true);
  });

  it('passes org tokens (gym ownership is enforced by GymAccessGuard)', async () => {
    const org = { sub: 'u-org', type: 'org', organizationId: 'o1', orgRole: 'OWNER' };
    await expect(guard.canActivate(ctx(org, 'POST'))).resolves.toBe(true);
  });

  it('denies when there is no authenticated user', async () => {
    await expect(guard.canActivate(ctx(undefined))).rejects.toBeInstanceOf(ForbiddenError);
    expect(findFirst).not.toHaveBeenCalled();
  });

  it('lets staff read a deleted member but not write to them', async () => {
    findFirst.mockResolvedValue({ userId: 'placeholder', status: 'DELETED' });
    const staff = gymUser('u-staff', ['members.details', 'members.edit']);
    await expect(guard.canActivate(ctx(staff, 'GET'))).resolves.toBe(true);
    await expect(guard.canActivate(ctx(staff, 'PATCH'))).rejects.toMatchObject({ code: 'MEMBER_DELETED' });
    await expect(guard.canActivate(ctx(staff, 'POST'))).rejects.toMatchObject({ code: 'MEMBER_DELETED' });
  });
});
