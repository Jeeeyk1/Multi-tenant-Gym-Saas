import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { WorkoutEmphasis, WorkoutFocus } from '../../../../common/enums';

/**
 * Optional parameters for the guided workout-plan generation flow.
 * Every field is optional — when omitted the plan falls back to the member's
 * profile (goal, experience, training days). The member can override any of
 * these from the guided question flow in the app.
 */
export class GenerateWorkoutPlanDto {
  @IsOptional()
  @IsEnum(WorkoutFocus)
  focus?: WorkoutFocus;

  @IsOptional()
  @IsEnum(WorkoutEmphasis)
  emphasis?: WorkoutEmphasis;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(7)
  daysPerWeek?: number;

  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(120)
  sessionMinutes?: number;
}
