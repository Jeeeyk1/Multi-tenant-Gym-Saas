import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { WorkoutSuggestionUseCase } from '../../application/use-cases/workout-suggestion.use-case';
import { MealSuggestionUseCase } from '../../application/use-cases/meal-suggestion.use-case';
import { AnalyseMealUseCase } from '../../application/use-cases/analyse-meal.use-case';
import { LogFoodUseCase } from '../../application/use-cases/log-food.use-case';
import { ListFoodLogsUseCase } from '../../application/use-cases/list-food-logs.use-case';
import { LogFoodDto } from '../dto/log-food.dto';
import { AnalyseMealDto } from '../dto/analyse-meal.dto';

@Controller('gyms/:gymId/members/:memberId')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(
    private readonly workoutSuggestionUseCase: WorkoutSuggestionUseCase,
    private readonly mealSuggestionUseCase: MealSuggestionUseCase,
    private readonly analyseMealUseCase: AnalyseMealUseCase,
    private readonly logFoodUseCase: LogFoodUseCase,
    private readonly listFoodLogsUseCase: ListFoodLogsUseCase,
  ) {}

  @Post('ai/workout-suggestion')
  @HttpCode(HttpStatus.OK)
  workoutSuggestion(@Param('gymId') gymId: string, @Param('memberId') memberId: string) {
    return this.workoutSuggestionUseCase.execute(memberId, gymId);
  }

  @Post('ai/meal-suggestion')
  @HttpCode(HttpStatus.OK)
  mealSuggestion(@Param('gymId') gymId: string, @Param('memberId') memberId: string) {
    return this.mealSuggestionUseCase.execute(memberId, gymId);
  }

  @Post('ai/analyse-meal')
  @HttpCode(HttpStatus.OK)
  analyseMeal(
    @Param('gymId') gymId: string,
    @Param('memberId') memberId: string,
    @Body() dto: AnalyseMealDto,
  ) {
    return this.analyseMealUseCase.execute(memberId, gymId, dto.description);
  }

  @Post('food-logs')
  @HttpCode(HttpStatus.CREATED)
  logFood(
    @Param('gymId') gymId: string,
    @Param('memberId') memberId: string,
    @Body() dto: LogFoodDto,
  ) {
    return this.logFoodUseCase.execute(memberId, gymId, dto);
  }

  @Get('food-logs')
  listFoodLogs(
    @Param('gymId') gymId: string,
    @Param('memberId') memberId: string,
    @Query('limit') limit?: string,
  ) {
    return this.listFoodLogsUseCase.execute(memberId, gymId, limit ? parseInt(limit, 10) : 20);
  }
}
