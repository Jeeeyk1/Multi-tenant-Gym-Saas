import { Injectable, Logger } from '@nestjs/common';
import { NotFoundError } from '../../../../common/errors';
import { assertGymAccess, assertPermission } from '../../../../common/auth/authorization';
import { findRoleSetting } from '../../../../common/auth/role-settings';
import { Permission } from '../../../../common/enums';
import { RoleSettingsRepository } from '../../infrastructure/persistence/role-settings.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

/**
 * The owner switches one setting on or off. It applies to each staff member's token at their
 * next refresh (permissions are carried in the JWT, which lasts 15 minutes by default).
 */
@Injectable()
export class UpdateRoleSettingUseCase {
  private readonly logger = new Logger(UpdateRoleSettingUseCase.name);

  constructor(private readonly repo: RoleSettingsRepository) {}

  async execute(gymId: string, key: string, enabled: boolean, caller: AuthenticatedUser): Promise<void> {
    assertGymAccess(caller, gymId);
    assertPermission(caller, Permission.GYM_SETTINGS);

    const setting = findRoleSetting(key);
    if (!setting) throw new NotFoundError('Unknown role setting', 'ROLE_SETTING_NOT_FOUND');

    const [enabledByDefault, override] = await Promise.all([
      this.repo.roleHasPermission(setting.role, setting.permission),
      this.repo.findOverride(gymId, setting.role, setting.permission),
    ]);
    const current = override?.isGranted ?? enabledByDefault;
    if (current === enabled) return;

    await this.repo.setOverride(gymId, setting.role, setting.permission, {
      isGranted: enabled,
      isDefault: enabled === enabledByDefault,
      updatedBy: caller.sub,
    });
    this.logger.log(`role setting changed gym=${gymId} setting=${key} from=${current} to=${enabled} by=${caller.sub}`);
  }
}
