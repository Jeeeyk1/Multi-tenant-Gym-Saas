import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { WorkoutSuggestionUseCase } from '../../application/use-cases/workout-suggestion.use-case';
import { MealSuggestionUseCase } from '../../application/use-cases/meal-suggestion.use-case';
import { AnalyseMealUseCase } from '../../application/use-cases/analyse-meal.use-case';
import { LogFoodUseCase } from '../../application/use-cases/log-food.use-case';
import { ListFoodLogsUseCase } from '../../application/use-cases/list-food-logs.use-case';
import { UploadFoodPhotoUseCase } from '../../application/use-cases/upload-food-photo.use-case';
import { GetLatestWorkoutPlanUseCase } from '../../application/use-cases/get-latest-workout-plan.use-case';
import { GetExerciseInstructionsUseCase } from '../../application/use-cases/get-exercise-instructions.use-case';
import { GetExerciseMediaUseCase } from '../../application/use-cases/get-exercise-media.use-case';
import { LogFoodDto } from '../dto/log-food.dto';
import { ExerciseInstructionsDto } from '../dto/exercise-instructions.dto';
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
    private readonly uploadFoodPhotoUseCase: UploadFoodPhotoUseCase,
    private readonly getLatestWorkoutPlanUseCase: GetLatestWorkoutPlanUseCase,
    private readonly getExerciseInstructionsUseCase: GetExerciseInstructionsUseCase,
    private readonly getExerciseMediaUseCase: GetExerciseMediaUseCase,
  ) {}

  @Get('ai/workout-plan')
  getWorkoutPlan(@Param('memberId') memberId: string) {
    return this.getLatestWorkoutPlanUseCase.execute(memberId);
  }

  @Get('ai/exercise-media')
  getExerciseMedia(@Query('name') name: string) {
    if (!name?.trim()) throw new BadRequestException('name query param is required');
    return this.getExerciseMediaUseCase.execute(name.trim());
  }

  @Post('ai/exercise-instructions')
  @HttpCode(HttpStatus.OK)
  getExerciseInstructions(
    @Param('gymId') gymId: string,
    @Param('memberId') memberId: string,
    @Body() dto: ExerciseInstructionsDto,
  ) {
    return this.getExerciseInstructionsUseCase.execute(dto.exerciseName, memberId, gymId);
  }

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

  /** Upload a food photo and get back its Cloudinary URL. */
  @Post('ai/food-photo')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('photo', {
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          return cb(new BadRequestException('Only image files are allowed'), false);
        }
        cb(null, true);
      },
    }),
  )
  uploadFoodPhoto(
    @Param('memberId') memberId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Photo is required');
    return this.uploadFoodPhotoUseCase.execute(memberId, file.buffer);
  }

  /** Analyse a meal — by photo URL (vision) or text description (text AI). */
  @Post('ai/analyse-meal')
  @HttpCode(HttpStatus.OK)
  analyseMeal(
    @Param('gymId') gymId: string,
    @Param('memberId') memberId: string,
    @Body() dto: AnalyseMealDto,
  ) {
    if (!dto.photoUrl && !dto.description) {
      throw new BadRequestException('Either photoUrl or description is required');
    }
    return this.analyseMealUseCase.execute(memberId, gymId, {
      photoUrl: dto.photoUrl,
      description: dto.description,
    });
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
