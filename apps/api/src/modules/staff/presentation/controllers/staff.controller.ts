import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { InviteStaffUseCase } from '../../application/use-cases/invite-staff.use-case';
import { DeactivateStaffUseCase } from '../../application/use-cases/deactivate-staff.use-case';
import { AssignRoleUseCase } from '../../application/use-cases/assign-role.use-case';
import { RemoveRoleUseCase } from '../../application/use-cases/remove-role.use-case';
import { ListStaffUseCase } from '../../application/use-cases/list-staff.use-case';
import { InviteStaffDto } from '../dto/invite-staff.dto';
import { AssignRoleDto } from '../dto/assign-role.dto';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

@Controller('gyms/:gymId/staff')
@UseGuards(JwtAuthGuard)
export class StaffController {
  constructor(
    private readonly inviteStaffUseCase: InviteStaffUseCase,
    private readonly deactivateStaffUseCase: DeactivateStaffUseCase,
    private readonly assignRoleUseCase: AssignRoleUseCase,
    private readonly removeRoleUseCase: RemoveRoleUseCase,
    private readonly listStaffUseCase: ListStaffUseCase,
  ) {}

  /**
   * POST /gyms/:gymId/staff
   * Invite a new staff member. Requires staff.manage permission (gym-level)
   * or org-level token.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  invite(
    @Param('gymId') gymId: string,
    @Body() dto: InviteStaffDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inviteStaffUseCase.execute(
      gymId,
      { email: dto.email!, fullName: dto.fullName!, phone: dto.phone },
      user,
    );
  }

  /**
   * DELETE /gyms/:gymId/staff/:staffId
   * Deactivate a staff member. Requires staff.manage permission.
   */
  @Delete(':staffId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deactivate(
    @Param('gymId') gymId: string,
    @Param('staffId') staffId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deactivateStaffUseCase.execute(gymId, staffId, user);
  }

  /**
   * POST /gyms/:gymId/staff/:staffId/roles
   * Assign a role to a staff member. Requires staff.manage permission.
   */
  @Post(':staffId/roles')
  @HttpCode(HttpStatus.CREATED)
  assignRole(
    @Param('gymId') gymId: string,
    @Param('staffId') staffId: string,
    @Body() dto: AssignRoleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.assignRoleUseCase.execute(gymId, staffId, { roleId: dto.roleId! }, user);
  }

  /**
   * DELETE /gyms/:gymId/staff/:staffId/roles/:roleId
   * Remove a role from a staff member. Requires staff.manage permission.
   */
  @Delete(':staffId/roles/:roleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeRole(
    @Param('gymId') gymId: string,
    @Param('staffId') staffId: string,
    @Param('roleId') roleId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.removeRoleUseCase.execute(gymId, staffId, roleId, user);
  }

  /**
   * GET /gyms/:gymId/staff
   * List all staff members. Requires staff.view or staff.manage permission.
   */
  @Get()
  list(@Param('gymId') gymId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.listStaffUseCase.execute(gymId, user);
  }
}
