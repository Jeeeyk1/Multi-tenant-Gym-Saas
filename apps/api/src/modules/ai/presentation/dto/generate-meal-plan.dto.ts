import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { MealPlanMode, MealStyle } from '../../../../common/enums';

/**
 * Parameters for the guided meal-plan generation flow.
 * All numeric inputs are optional — when omitted the AI estimates from the
 * member's profile. `mealCount` applies to FULL_DAY; `targetProteinG` is the
 * key macro asked for in SINGLE_MEAL.
 */
export class GenerateMealPlanDto {
  @IsEnum(MealPlanMode)
  mode!: MealPlanMode;

  /** Whole day for FULL_DAY (at least 800, checked in the use case), one meal for SINGLE_MEAL. */
  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(6000)
  targetCalories?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8)
  mealCount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(400)
  targetProteinG?: number;

  /** Optional steer: quick to make, budget-friendly, extra protein or light. */
  @IsOptional()
  @IsEnum(MealStyle)
  style?: MealStyle;
}
