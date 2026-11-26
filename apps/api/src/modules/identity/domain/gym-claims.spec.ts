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
});
