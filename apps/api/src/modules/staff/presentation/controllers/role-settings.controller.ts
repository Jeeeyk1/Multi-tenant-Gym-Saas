import { Body, Controller, Get, HttpCode, HttpStatus, Param, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { ListRoleSettingsUseCase } from '../../application/use-cases/list-role-settings.use-case';
import { UpdateRoleSettingUseCase } from '../../application/use-cases/update-role-setting.use-case';
import { UpdateRoleSettingDto } from '../dto/update-role-setting.dto';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

@Controller('gyms/:gymId/role-settings')
@UseGuards(JwtAuthGuard)
export class RoleSettingsController {
  constructor(
    private readonly listRoleSettings: ListRoleSettingsUseCase,
    private readonly updateRoleSetting: UpdateRoleSettingUseCase,
  ) {}

  /** GET /gyms/:gymId/role-settings — the owner's switches for Staff and Trainers. */
  @Get()
  list(@Param('gymId') gymId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.listRoleSettings.execute(gymId, user);
  }

  /** PUT /gyms/:gymId/role-settings/:key — switch one on or off. */
  @Put(':key')
  @HttpCode(HttpStatus.NO_CONTENT)
  update(
    @Param('gymId') gymId: string,
    @Param('key') key: string,
    @Body() dto: UpdateRoleSettingDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.updateRoleSetting.execute(gymId, key, dto.enabled, user);
  }
}
