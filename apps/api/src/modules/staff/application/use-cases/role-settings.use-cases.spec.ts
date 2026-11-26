import { ListRoleSettingsUseCase } from './list-role-settings.use-case';
import { UpdateRoleSettingUseCase } from './update-role-setting.use-case';
import { RoleSettingKey } from '../../../../common/auth/role-settings';
import type { RoleSettingsRepository } from '../../infrastructure/persistence/role-settings.repository';
import type { GymAuthUser } from '../../../../common/types/auth.types';

const repo = {
  roleHasPermission: jest.fn(),
  findOverride: jest.fn(),
  setOverride: jest.fn(),
} as unknown as jest.Mocked<RoleSettingsRepository>;

const owner: GymAuthUser = { sub: 'owner-1', type: 'gym', gymId: 'gym-1', roles: ['OWNER'], permissions: ['gym.settings'] };
const staff: GymAuthUser = { sub: 'staff-1', type: 'gym', gymId: 'gym-1', roles: ['STAFF'], permissions: ['leaderboard.manage'] };

describe('role settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    repo.roleHasPermission.mockResolvedValue(true);
    repo.findOverride.mockResolvedValue(null);
  });

  it('lists each setting with its default and the gym value', async () => {
    repo.findOverride.mockResolvedValue({ isGranted: false } as never);
    const [setting] = await new ListRoleSettingsUseCase(repo).execute('gym-1', owner);
    expect(setting).toMatchObject({ key: RoleSettingKey.STAFF_MANAGES_LEADERBOARD, enabled: false, enabledByDefault: true });
  });

  it('falls back to the role default when the gym has not changed it', async () => {
    const [setting] = await new ListRoleSettingsUseCase(repo).execute('gym-1', owner);
    expect(setting).toMatchObject({ enabled: true, enabledByDefault: true });
  });

  it('stores a change from the default and clears it when switched back', async () => {
    const useCase = new UpdateRoleSettingUseCase(repo);
    await useCase.execute('gym-1', RoleSettingKey.STAFF_MANAGES_LEADERBOARD, false, owner);
    expect(repo.setOverride).toHaveBeenLastCalledWith('gym-1', 'STAFF', 'leaderboard.manage', expect.objectContaining({ isGranted: false, isDefault: false }));

    repo.findOverride.mockResolvedValue({ isGranted: false } as never);
    await useCase.execute('gym-1', RoleSettingKey.STAFF_MANAGES_LEADERBOARD, true, owner);
    expect(repo.setOverride).toHaveBeenLastCalledWith('gym-1', 'STAFF', 'leaderboard.manage', expect.objectContaining({ isGranted: true, isDefault: true }));
  });

  it('does nothing when the value is unchanged', async () => {
    await new UpdateRoleSettingUseCase(repo).execute('gym-1', RoleSettingKey.STAFF_MANAGES_LEADERBOARD, true, owner);
    expect(repo.setOverride).not.toHaveBeenCalled();
  });

  it("refuses another gym's settings", async () => {
    await expect(new ListRoleSettingsUseCase(repo).execute('gym-2', owner)).rejects.toMatchObject({ code: 'GYM_ACCESS_DENIED' });
  });

  it('is for owners only (gym.settings)', async () => {
    await expect(new UpdateRoleSettingUseCase(repo).execute('gym-1', RoleSettingKey.STAFF_MANAGES_LEADERBOARD, false, staff)).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
    expect(repo.setOverride).not.toHaveBeenCalled();
  });

  it('rejects an unknown setting', async () => {
    await expect(new UpdateRoleSettingUseCase(repo).execute('gym-1', 'NOPE', false, owner)).rejects.toMatchObject({
      code: 'ROLE_SETTING_NOT_FOUND',
    });
  });
});
