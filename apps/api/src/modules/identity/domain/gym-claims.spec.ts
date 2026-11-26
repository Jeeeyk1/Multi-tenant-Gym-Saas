import { gymClaims } from './gym-claims';

const staff = (role: string, keys: string[]) => ({
  roles: [{ role: { name: role, rolePermissions: keys.map((key) => ({ permission: { key } })) } }],
});

describe('gymClaims', () => {
  it('gives staff the permissions of their roles', () => {
    expect(gymClaims(staff('TRAINER', ['checkins.manage']), false)).toEqual({
      roles: ['TRAINER'],
      permissions: ['checkins.manage'],
    });
  });

  it('adds the member role and permissions for staff who are also members', () => {
    const claims = gymClaims(staff('TRAINER', ['checkins.manage']), true);
    expect(claims?.roles).toEqual(['TRAINER', 'MEMBER']);
    expect(claims?.permissions).toEqual(expect.arrayContaining(['checkins.manage', 'checkins.self', 'announcements.view']));
  });

  it('gives members only the member permissions', () => {
    expect(gymClaims(null, true)).toEqual({ roles: ['MEMBER'], permissions: ['checkins.self', 'announcements.view'] });
  });

  it('returns null for someone who is neither staff nor a member', () => {
    expect(gymClaims(null, false)).toBeNull();
  });

  it("applies the gym's overrides per role, so another role's permission is kept", () => {
    const off = [{ roleName: 'STAFF', permissionKey: 'leaderboard.manage', isGranted: false }];
    expect(gymClaims(staff('STAFF', ['leaderboard.manage', 'checkins.manage']), false, off)?.permissions).toEqual(['checkins.manage']);

    const staffAndOwner = {
      roles: [...staff('STAFF', ['leaderboard.manage']).roles, ...staff('OWNER', ['leaderboard.manage']).roles],
    };
    expect(gymClaims(staffAndOwner, false, off)?.permissions).toEqual(['leaderboard.manage']);
  });
});
