import { Module } from '@nestjs/common';
import { AiProviderModule } from '../../common/adapters/ai/ai-provider.module';
import { VisionProviderModule } from '../../common/adapters/ai/vision-provider.module';
import { StorageModule } from '../../common/adapters/storage/storage.module';
import { AiRepository } from './infrastructure/persistence/ai.repository';
import { WorkoutSuggestionUseCase } from './application/use-cases/workout-suggestion.use-case';
import { SwapWorkoutExerciseUseCase } from './application/use-cases/swap-workout-exercise.use-case';
import { MealSuggestionUseCase } from './application/use-cases/meal-suggestion.use-case';
import { AnalyseMealUseCase } from './application/use-cases/analyse-meal.use-case';
import { LogFoodUseCase } from './application/use-cases/log-food.use-case';
import { ListFoodLogsUseCase } from './application/use-cases/list-food-logs.use-case';
import { UploadFoodPhotoUseCase } from './application/use-cases/upload-food-photo.use-case';
import { GetLatestWorkoutPlanUseCase } from './application/use-cases/get-latest-workout-plan.use-case';
import { GetLatestMealPlanUseCase } from './application/use-cases/get-latest-meal-plan.use-case';
import { GetExerciseInstructionsUseCase } from './application/use-cases/get-exercise-instructions.use-case';
import { GetExerciseMediaUseCase } from './application/use-cases/get-exercise-media.use-case';
import { MemberAiLimitsService } from './application/member-ai-limits.service';
import { GetMemberAiUsageUseCase } from './application/use-cases/get-member-ai-usage.use-case';
import { AiController } from './presentation/controllers/ai.controller';

@Module({
  imports: [AiProviderModule, VisionProviderModule, StorageModule],
  controllers: [AiController],
  providers: [
    AiRepository,
    MemberAiLimitsService,
    GetMemberAiUsageUseCase,
    WorkoutSuggestionUseCase,
    SwapWorkoutExerciseUseCase,
    MealSuggestionUseCase,
    AnalyseMealUseCase,
    LogFoodUseCase,
    ListFoodLogsUseCase,
    UploadFoodPhotoUseCase,
    GetLatestWorkoutPlanUseCase,
    GetLatestMealPlanUseCase,
    GetExerciseInstructionsUseCase,
    GetExerciseMediaUseCase,
  ],
})
export class AiModule {}
