import { IsBoolean, IsIn, IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

const FITNESS_GOALS = ['LOSE_WEIGHT', 'BUILD_MUSCLE', 'GET_FIT', 'STAY_HEALTHY', 'OTHER'] as const;
const ACTIVITY_LEVELS = ['BEGINNER', 'OCCASIONALLY_ACTIVE', 'PRETTY_ACTIVE', 'VERY_ACTIVE'] as const;

export class UpsertMyProfileDto {
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(100)
  age?: number;

  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(500)
  weightKg?: number;

  @IsOptional()
  @IsInt()
  @Min(50)
  @Max(300)
  heightCm?: number;

  @IsOptional()
  @IsIn(FITNESS_GOALS)
  fitnessGoal?: string;

  @IsOptional()
  @IsIn(ACTIVITY_LEVELS)
  activityLevel?: string;

  @IsOptional()
  @IsBoolean()
  onboardingDone?: boolean;
}
