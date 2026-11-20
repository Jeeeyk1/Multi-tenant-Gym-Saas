import { assertCanManageStaff } from './staff-management.rules';
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
  it('lets a manager assign a non-owner role to someone else', () => {
    expect(() => assertCanManageStaff(gymCaller(['MANAGER']), staff('user-2'), 'TRAINER')).not.toThrow();
  });

  it('blocks changing your own staff access', () => {
    expect(() => assertCanManageStaff(gymCaller(['MANAGER']), staff('user-caller'), 'TRAINER')).toThrow(
      expect.objectContaining({ code: 'CANNOT_MANAGE_SELF' }),
    );
    expect(() => assertCanManageStaff(gymCaller(['GYM_OWNER']), staff('user-caller', 'GYM_OWNER'))).toThrow(
      expect.objectContaining({ code: 'CANNOT_MANAGE_SELF' }),
    );
  });

  it('blocks a manager from granting the owner role', () => {
    expect(() => assertCanManageStaff(gymCaller(['MANAGER']), staff('user-2'), 'GYM_OWNER')).toThrow(
      expect.objectContaining({ code: 'OWNER_ROLE_PROTECTED' }),
    );
  });

  it('blocks a manager from acting on an owner', () => {
    expect(() => assertCanManageStaff(gymCaller(['MANAGER']), staff('user-2', 'GYM_OWNER'))).toThrow(
      expect.objectContaining({ code: 'OWNER_ROLE_PROTECTED' }),
    );
  });

  it('lets an owner grant the owner role and manage another owner', () => {
    expect(() => assertCanManageStaff(gymCaller(['GYM_OWNER']), staff('user-2'), 'GYM_OWNER')).not.toThrow();
    expect(() => assertCanManageStaff(gymCaller(['GYM_OWNER']), staff('user-2', 'GYM_OWNER'))).not.toThrow();
  });

  it('does not restrict org-level callers', () => {
    expect(() => assertCanManageStaff(orgCaller, staff('user-org', 'GYM_OWNER'), 'GYM_OWNER')).not.toThrow();
  });
});
