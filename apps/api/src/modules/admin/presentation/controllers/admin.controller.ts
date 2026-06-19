import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SystemAdminGuard } from '../guards/system-admin.guard';
import { GetPlatformStatsUseCase } from '../../application/use-cases/get-platform-stats.use-case';
import { ListGymsUseCase } from '../../application/use-cases/list-gyms.use-case';
import { GetGymDetailUseCase } from '../../application/use-cases/get-gym-detail.use-case';
import { CreateGymClientUseCase } from '../../application/use-cases/create-gym-client.use-case';
import { UpdateGymStatusUseCase } from '../../application/use-cases/update-gym-status.use-case';
import { ListUsersUseCase } from '../../application/use-cases/list-users.use-case';
import { ListPlansUseCase } from '../../application/use-cases/list-plans.use-case';
import { CreatePlanUseCase } from '../../application/use-cases/create-plan.use-case';
import { UpdatePlanUseCase } from '../../application/use-cases/update-plan.use-case';
import { DeletePlanUseCase } from '../../application/use-cases/delete-plan.use-case';
import { ResendInviteUseCase } from '../../application/use-cases/resend-invite.use-case';
import { CreateGymClientDto } from '../dto/create-gym-client.dto';
import { UpdateGymStatusDto } from '../dto/update-gym-status.dto';
import { CreatePlanDto } from '../dto/create-plan.dto';
import { UpdatePlanDto } from '../dto/update-plan.dto';

@Controller('admin')
@UseGuards(SystemAdminGuard)
export class AdminController {
  constructor(
    private readonly getStats: GetPlatformStatsUseCase,
    private readonly listGyms: ListGymsUseCase,
    private readonly getGymDetail: GetGymDetailUseCase,
    private readonly createGymClient: CreateGymClientUseCase,
    private readonly updateGymStatus: UpdateGymStatusUseCase,
    private readonly listUsers: ListUsersUseCase,
    private readonly listPlans: ListPlansUseCase,
    private readonly createPlan: CreatePlanUseCase,
    private readonly updatePlan: UpdatePlanUseCase,
    private readonly deletePlan: DeletePlanUseCase,
    private readonly resendInvite: ResendInviteUseCase,
  ) {}

  @Get('stats')
  stats() {
    return this.getStats.execute();
  }

  @Get('gyms')
  gyms(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.listGyms.execute(+page, +limit);
  }

  @Get('gyms/:id')
  gym(@Param('id') id: string) {
    return this.getGymDetail.execute(id);
  }

  @Post('gyms')
  @HttpCode(HttpStatus.CREATED)
  createGym(@Body() dto: CreateGymClientDto) {
    return this.createGymClient.execute({
      gymName: dto.gymName,
      gymCode: dto.gymCode,
      ownerEmail: dto.ownerEmail,
      ownerFullName: dto.ownerFullName,
    });
  }

  @Patch('gyms/:id/status')
  @HttpCode(HttpStatus.OK)
  updateStatus(@Param('id') id: string, @Body() dto: UpdateGymStatusDto) {
    return this.updateGymStatus.execute(id, dto.status);
  }

  @Post('gyms/:id/resend-invite')
  @HttpCode(HttpStatus.OK)
  resendGymOwnerInvite(@Param('id') id: string) {
    return this.resendInvite.execute(id);
  }

  @Get('users')
  users(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('gymId') gymId?: string,
  ) {
    return this.listUsers.execute(+page, +limit, gymId);
  }

  @Get('plans')
  plans() {
    return this.listPlans.execute();
  }

  @Post('plans')
  @HttpCode(HttpStatus.CREATED)
  createNewPlan(@Body() dto: CreatePlanDto) {
    return this.createPlan.execute(dto);
  }

  @Patch('plans/:id')
  @HttpCode(HttpStatus.OK)
  patchPlan(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.updatePlan.execute(id, dto);
  }

  @Delete('plans/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removePlan(@Param('id') id: string) {
    return this.deletePlan.execute(id);
  }
}
