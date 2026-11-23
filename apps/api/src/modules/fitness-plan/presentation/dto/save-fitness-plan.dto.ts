import { IsEnum, IsOptional } from 'class-validator';
import { GoalPace } from '../../../../common/enums';

export class SaveFitnessPlanDto {
  /** Omit to take the recommended pace. Must be omitted when the plan is maintenance. */
  @IsOptional()
  @IsEnum(GoalPace)
  pace?: GoalPace;
}
