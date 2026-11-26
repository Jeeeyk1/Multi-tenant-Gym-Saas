import { assertCanGrantRole, assertCanManageStaff } from './staff-management.rules';
import type { GymAuthUser, OrgAuthUser } from '../../../common/types/auth.types';

const gymCaller = (roles: string[]): GymAuthUser => ({
  sub: 'user-caller',
  type: 'gym',
  gymId: 'gym-1',
  roles,
  permissions: ['staff.manage'],
});
const orgCaller: OrgAuthUser = { sub: 'user-org', type: 'org', organizationId: 'org-1', orgRole: 'OWNER' };

const staff = (userId: string, ...roleNames: string[]) => ({
  userId,
  roles: roleNames.map((name) => ({ role: { name } })),
});

describe('assertCanManageStaff', () => {
  it('lets a staff member assign a non-owner role to someone else', () => {
    expect(() => assertCanManageStaff(gymCaller(['STAFF']), staff('user-2'), 'TRAINER')).not.toThrow();
  });

  it('blocks changing your own staff access', () => {
    expect(() => assertCanManageStaff(gymCaller(['STAFF']), staff('user-caller'), 'TRAINER')).toThrow(
      expect.objectContaining({ code: 'CANNOT_MANAGE_SELF' }),
    );
    expect(() => assertCanManageStaff(gymCaller(['OWNER']), staff('user-caller', 'OWNER'))).toThrow(
      expect.objectContaining({ code: 'CANNOT_MANAGE_SELF' }),
    );
  });

  it('blocks a staff member from granting the owner role', () => {
    expect(() => assertCanManageStaff(gymCaller(['STAFF']), staff('user-2'), 'OWNER')).toThrow(
      expect.objectContaining({ code: 'OWNER_ROLE_PROTECTED' }),
    );
  });

  it('blocks a staff member from acting on an owner', () => {
    expect(() => assertCanManageStaff(gymCaller(['STAFF']), staff('user-2', 'OWNER'))).toThrow(
      expect.objectContaining({ code: 'OWNER_ROLE_PROTECTED' }),
    );
  });

  it('lets an owner grant the owner role and manage another owner', () => {
    expect(() => assertCanManageStaff(gymCaller(['OWNER']), staff('user-2'), 'OWNER')).not.toThrow();
    expect(() => assertCanManageStaff(gymCaller(['OWNER']), staff('user-2', 'OWNER'))).not.toThrow();
  });

  it('does not restrict org-level callers', () => {
    expect(() => assertCanManageStaff(orgCaller, staff('user-org', 'OWNER'), 'OWNER')).not.toThrow();
  });
});

describe('assertCanGrantRole', () => {
  it('lets only an owner invite someone as an owner', () => {
    expect(() => assertCanGrantRole(gymCaller(['STAFF']), 'OWNER')).toThrow(expect.objectContaining({ code: 'OWNER_ROLE_PROTECTED' }));
    expect(() => assertCanGrantRole(gymCaller(['OWNER']), 'OWNER')).not.toThrow();
    expect(() => assertCanGrantRole(gymCaller(['STAFF']), 'TRAINER')).not.toThrow();
  });
});
