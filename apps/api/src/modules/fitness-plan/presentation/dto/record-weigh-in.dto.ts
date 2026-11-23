import { IsNumber, Max, Min } from 'class-validator';
import { PROFILE_LIMITS } from '../../domain/fitness-plan.calculator';

export class RecordWeighInDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(PROFILE_LIMITS.weightKg.min)
  @Max(PROFILE_LIMITS.weightKg.max)
  weightKg!: number;
}
