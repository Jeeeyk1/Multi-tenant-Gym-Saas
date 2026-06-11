import { Module } from '@nestjs/common';
import { AiProviderModule } from '../../common/adapters/ai/ai-provider.module';
import { AiRepository } from './infrastructure/persistence/ai.repository';
import { WorkoutSuggestionUseCase } from './application/use-cases/workout-suggestion.use-case';
import { MealSuggestionUseCase } from './application/use-cases/meal-suggestion.use-case';
import { AnalyseMealUseCase } from './application/use-cases/analyse-meal.use-case';
import { LogFoodUseCase } from './application/use-cases/log-food.use-case';
import { ListFoodLogsUseCase } from './application/use-cases/list-food-logs.use-case';
import { AiController } from './presentation/controllers/ai.controller';

@Module({
  imports: [AiProviderModule],
  controllers: [AiController],
  providers: [
    AiRepository,
    WorkoutSuggestionUseCase,
    MealSuggestionUseCase,
    AnalyseMealUseCase,
    LogFoodUseCase,
    ListFoodLogsUseCase,
  ],
})
export class AiModule {}
