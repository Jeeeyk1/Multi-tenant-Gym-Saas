import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import {
  FitnessGoal,
  ActivityLevel,
  ExperienceLevel,
  PreferredStyle,
  DietType,
} from '../../../../common/enums';

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
  @IsNumber()
  @Min(20)
  @Max(500)
  targetWeightKg?: number;

  @IsOptional()
  @IsInt()
  @Min(50)
  @Max(300)
  heightCm?: number;

  @IsOptional()
  @IsEnum(FitnessGoal)
  fitnessGoal?: FitnessGoal;

  @IsOptional()
  @IsEnum(ActivityLevel)
  activityLevel?: ActivityLevel;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(7)
  daysPerWeek?: number;

  @IsOptional()
  @IsEnum(ExperienceLevel)
  experienceLevel?: ExperienceLevel;

  @IsOptional()
  @IsEnum(PreferredStyle)
  preferredStyle?: PreferredStyle;

  @IsOptional()
  @IsEnum(DietType)
  dietType?: DietType;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  injuries?: string;

  @IsOptional()
  @IsBoolean()
  onboardingDone?: boolean;
}
