import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { CreatePlanUseCase } from '../../application/use-cases/create-plan.use-case';
import { UpdatePlanUseCase } from '../../application/use-cases/update-plan.use-case';
import { ListPlansUseCase } from '../../application/use-cases/list-plans.use-case';
import { CreatePlanDto } from '../dto/create-plan.dto';
import { UpdatePlanDto } from '../dto/update-plan.dto';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

@Controller('gyms/:gymId/plans')
@UseGuards(JwtAuthGuard)
export class MembershipPlansController {
  constructor(
    private readonly createPlanUseCase: CreatePlanUseCase,
    private readonly updatePlanUseCase: UpdatePlanUseCase,
    private readonly listPlansUseCase: ListPlansUseCase,
  ) {}

  /**
   * POST /gyms/:gymId/plans
   * Create a membership plan. Requires gym.settings permission.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('gymId') gymId: string,
    @Body() dto: CreatePlanDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.createPlanUseCase.execute(
      gymId,
      {
        name: dto.name,
        type: dto.type,
        description: dto.description,
        price: dto.price,
        durationDays: dto.durationDays,
      },
      user,
    );
  }

  /**
   * PATCH /gyms/:gymId/plans/:planId
   * Update a membership plan. Requires gym.settings permission.
   */
  @Patch(':planId')
  update(
    @Param('gymId') gymId: string,
    @Param('planId') planId: string,
    @Body() dto: UpdatePlanDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.updatePlanUseCase.execute(
      gymId,
      planId,
      {
        name: dto.name,
        type: dto.type,
        description: dto.description,
        price: dto.price,
        durationDays: dto.durationDays,
        isActive: dto.isActive,
      },
      user,
    );
  }

  /**
   * GET /gyms/:gymId/plans
   * List membership plans. Requires members.view permission.
   */
  @Get()
  list(@Param('gymId') gymId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.listPlansUseCase.execute(gymId, user);
  }
}
