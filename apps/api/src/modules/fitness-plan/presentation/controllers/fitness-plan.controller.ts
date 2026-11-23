import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { MemberSelfGuard } from '../../../../common/guards/member-self.guard';
import { GetCurrentFitnessPlanUseCase } from '../../application/use-cases/get-current-fitness-plan.use-case';
import { GetFitnessPlanOptionsUseCase } from '../../application/use-cases/get-fitness-plan-options.use-case';
import { SaveFitnessPlanUseCase } from '../../application/use-cases/save-fitness-plan.use-case';
import { GetDailyNutritionUseCase } from '../../application/use-cases/get-daily-nutrition.use-case';
import { SaveFitnessPlanDto } from '../dto/save-fitness-plan.dto';
import { DailyNutritionQueryDto } from '../dto/daily-nutrition-query.dto';
import { RecordWeighInDto } from '../dto/record-weigh-in.dto';
import { RecordWeighInUseCase } from '../../application/use-cases/record-weigh-in.use-case';

/**
 * A member's calorie/macro targets. Member-only: the plan is derived from health
 * data (and reveals the health-caution flag), so staff cannot read or set it.
 */
@Controller('gyms/:gymId/members/:memberId/fitness-plan')
@UseGuards(JwtAuthGuard, MemberSelfGuard)
export class FitnessPlanController {
  constructor(
    private readonly getCurrentFitnessPlanUseCase: GetCurrentFitnessPlanUseCase,
    private readonly getFitnessPlanOptionsUseCase: GetFitnessPlanOptionsUseCase,
    private readonly saveFitnessPlanUseCase: SaveFitnessPlanUseCase,
    private readonly getDailyNutritionUseCase: GetDailyNutritionUseCase,
    private readonly recordWeighInUseCase: RecordWeighInUseCase,
  ) {}

  /** GET .../fitness-plan — the active plan, or null. */
  @Get()
  getCurrent(@Param('gymId') gymId: string, @Param('memberId') memberId: string) {
    return this.getCurrentFitnessPlanUseCase.execute(gymId, memberId);
  }

  /** GET .../fitness-plan/options — maintenance and each pace, calculated from the profile. */
  @Get('options')
  getOptions(@Param('gymId') gymId: string, @Param('memberId') memberId: string) {
    return this.getFitnessPlanOptionsUseCase.execute(gymId, memberId);
  }

  /** POST .../fitness-plan — save the plan for a pace as the active plan. */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  save(
    @Param('gymId') gymId: string,
    @Param('memberId') memberId: string,
    @Body() dto: SaveFitnessPlanDto,
  ) {
    return this.saveFitnessPlanUseCase.execute(gymId, memberId, dto.pace);
  }

  /**
   * POST .../fitness-plan/weigh-ins — log today's weight. Recalculates the plan once
   * weight has moved 2 kg or more since it was made.
   */
  @Post('weigh-ins')
  @HttpCode(HttpStatus.CREATED)
  recordWeighIn(
    @Param('gymId') gymId: string,
    @Param('memberId') memberId: string,
    @Body() dto: RecordWeighInDto,
  ) {
    return this.recordWeighInUseCase.execute(gymId, memberId, dto.weightKg);
  }

  /** GET .../fitness-plan/daily-nutrition?date=YYYY-MM-DD — eaten vs targets for a day. */
  @Get('daily-nutrition')
  getDailyNutrition(
    @Param('gymId') gymId: string,
    @Param('memberId') memberId: string,
    @Query() query: DailyNutritionQueryDto,
  ) {
    return this.getDailyNutritionUseCase.execute(gymId, memberId, query.date);
  }
}
