import { assertAnyPermission, assertGymAccess, assertPermission, hasPermission } from './authorization';
import { Permission } from '../enums';
import type { AuthenticatedUser } from '../types/auth.types';

const gymUser = (permissions: string[], gymId = 'gym-1'): AuthenticatedUser => ({
  sub: 'u1',
  type: 'gym',
  gymId,
  roles: ['STAFF'],
  permissions,
});
const orgUser: AuthenticatedUser = { sub: 'owner', type: 'org', organizationId: 'org-1', orgRole: 'OWNER' };

describe('authorization', () => {
  it('limits gym tokens to their own gym', () => {
    expect(() => assertGymAccess(gymUser([]), 'gym-1')).not.toThrow();
    expect(() => assertGymAccess(gymUser([]), 'gym-2')).toThrow(expect.objectContaining({ code: 'GYM_ACCESS_DENIED' }));
  });

  it('checks gym tokens for the permission', () => {
    expect(hasPermission(gymUser([Permission.MEMBERS_VIEW]), Permission.MEMBERS_VIEW)).toBe(true);
    expect(() => assertPermission(gymUser([]), Permission.MEMBERS_VIEW)).toThrow(
      expect.objectContaining({ code: 'PERMISSION_DENIED', message: 'Missing permission: members.view' }),
    );
  });

  it('lets org tokens through (GymAccessGuard already scoped them to their gyms)', () => {
    expect(hasPermission(orgUser, Permission.BILLING_MANAGE)).toBe(true);
    expect(() => assertGymAccess(orgUser, 'any-gym')).not.toThrow();
  });

  it('passes assertAnyPermission when one of the permissions is held', () => {
    expect(() => assertAnyPermission(gymUser([Permission.STAFF_MANAGE]), Permission.STAFF_VIEW, Permission.STAFF_MANAGE)).not.toThrow();
    expect(() => assertAnyPermission(gymUser([]), Permission.STAFF_VIEW, Permission.STAFF_MANAGE)).toThrow(
      expect.objectContaining({ message: 'Missing permission: staff.view' }),
    );
  });
});
