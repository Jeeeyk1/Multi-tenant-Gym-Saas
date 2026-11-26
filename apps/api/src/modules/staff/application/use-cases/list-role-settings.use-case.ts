import { Injectable } from '@nestjs/common';
import { assertGymAccess, assertPermission } from '../../../../common/auth/authorization';
import { ROLE_SETTINGS, type RoleSetting } from '../../../../common/auth/role-settings';
import { Permission } from '../../../../common/enums';
import { RoleSettingsRepository } from '../../infrastructure/persistence/role-settings.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

export interface RoleSettingView extends Omit<RoleSetting, 'permission'> {
  permission: string;
  enabled: boolean;
  /** What the role does when the gym hasn't changed it. */
  enabledByDefault: boolean;
}

/** The owner's switches for what Staff and Trainers may do in this gym. */
@Injectable()
export class ListRoleSettingsUseCase {
  constructor(private readonly repo: RoleSettingsRepository) {}

  async execute(gymId: string, caller: AuthenticatedUser): Promise<RoleSettingView[]> {
    assertGymAccess(caller, gymId);
    assertPermission(caller, Permission.GYM_SETTINGS);

    return Promise.all(
      ROLE_SETTINGS.map(async (setting) => {
        const [enabledByDefault, override] = await Promise.all([
          this.repo.roleHasPermission(setting.role, setting.permission),
          this.repo.findOverride(gymId, setting.role, setting.permission),
        ]);
        return { ...setting, enabled: override?.isGranted ?? enabledByDefault, enabledByDefault };
      }),
    );
  }
}
