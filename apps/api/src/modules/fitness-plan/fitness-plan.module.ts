import { Module } from '@nestjs/common';
import { FitnessPlanRepository } from './infrastructure/persistence/fitness-plan.repository';
import { GetCurrentFitnessPlanUseCase } from './application/use-cases/get-current-fitness-plan.use-case';
import { GetFitnessPlanOptionsUseCase } from './application/use-cases/get-fitness-plan-options.use-case';
import { SaveFitnessPlanUseCase } from './application/use-cases/save-fitness-plan.use-case';
import { GetDailyNutritionUseCase } from './application/use-cases/get-daily-nutrition.use-case';
import { FitnessPlanController } from './presentation/controllers/fitness-plan.controller';

@Module({
  controllers: [FitnessPlanController],
  providers: [
    FitnessPlanRepository,
    GetCurrentFitnessPlanUseCase,
    GetFitnessPlanOptionsUseCase,
    SaveFitnessPlanUseCase,
    GetDailyNutritionUseCase,
  ],
})
export class FitnessPlanModule {}
