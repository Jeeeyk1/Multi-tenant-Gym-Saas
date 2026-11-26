import { applyRoleOverrides } from './role-settings';

const off = (roleName: string, permissionKey: string) => ({ roleName, permissionKey, isGranted: false });

describe('applyRoleOverrides', () => {
  it("removes an adjustable permission when the gym switches it off", () => {
    expect(applyRoleOverrides('STAFF', ['checkins.manage', 'leaderboard.manage'], [off('STAFF', 'leaderboard.manage')])).toEqual([
      'checkins.manage',
    ]);
  });

  it('never changes the owner role', () => {
    expect(applyRoleOverrides('OWNER', ['leaderboard.manage'], [off('OWNER', 'leaderboard.manage')])).toEqual(['leaderboard.manage']);
  });

  it('ignores overrides for permissions that are not adjustable', () => {
    expect(applyRoleOverrides('STAFF', ['members.details'], [off('STAFF', 'members.details')])).toEqual(['members.details']);
  });

  it('ignores overrides meant for another role', () => {
    expect(applyRoleOverrides('TRAINER', ['leaderboard.review'], [off('STAFF', 'leaderboard.manage')])).toEqual(['leaderboard.review']);
  });

  it('can grant an adjustable permission a role lacks by default', () => {
    expect(
      applyRoleOverrides('STAFF', ['checkins.manage'], [{ roleName: 'STAFF', permissionKey: 'leaderboard.manage', isGranted: true }]),
    ).toEqual(['checkins.manage', 'leaderboard.manage']);
  });
});
