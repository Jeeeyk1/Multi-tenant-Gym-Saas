import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import {
  FitnessGoal,
  ActivityLevel,
  ExperienceLevel,
  PreferredStyle,
  DietType,
  Sex,
  UnitSystem,
} from '../../../../common/enums';
import { PROFILE_LIMITS } from '../../../fitness-plan/domain/fitness-plan.calculator';

/**
 * Body for PATCH .../members/me/profile and PATCH .../members/:memberId/profile.
 * Every field is optional so the onboarding flow can save one step at a time.
 * Omitted fields are left unchanged; `targetWeightKg` and `injuries` also accept null
 * to clear them (IsOptional lets null through).
 * Weights and heights are always metric; `unitSystem` is the display preference.
 */
export class UpsertMyProfileDto {
  @IsOptional()
  @IsInt()
  @Min(PROFILE_LIMITS.age.min)
  @Max(PROFILE_LIMITS.age.max)
  age?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(PROFILE_LIMITS.weightKg.min)
  @Max(PROFILE_LIMITS.weightKg.max)
  weightKg?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(PROFILE_LIMITS.weightKg.min)
  @Max(PROFILE_LIMITS.weightKg.max)
  /** null clears a previously saved goal weight. */
  targetWeightKg?: number | null;

  @IsOptional()
  @IsInt()
  @Min(PROFILE_LIMITS.heightCm.min)
  @Max(PROFILE_LIMITS.heightCm.max)
  heightCm?: number;

  @IsOptional()
  @IsEnum(Sex)
  sex?: Sex;

  @IsOptional()
  @IsEnum(UnitSystem)
  unitSystem?: UnitSystem;

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
  /** null clears the note. */
  injuries?: string | null;

  /** Pregnancy or a medical condition. The fitness plan becomes conservative. */
  @IsOptional()
  @IsBoolean()
  healthCaution?: boolean;

  /**
   * The member's own consent to process their health data. Only honoured on the
   * member's own profile; staff cannot give or withdraw it on a member's behalf.
   */
  @IsOptional()
  @IsBoolean()
  healthDataConsent?: boolean;

  @IsOptional()
  @IsBoolean()
  onboardingDone?: boolean;
}
