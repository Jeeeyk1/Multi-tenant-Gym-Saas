import type { ProfileUpdateData } from '../infrastructure/persistence/members.repository';
import type { UpsertMyProfileDto } from '../presentation/dto/upsert-my-profile.dto';

/**
 * Copies the profile fields a DTO may set. Listed one by one so a new DTO field is
 * never written without a decision here. Health fields (healthCaution, consent) are
 * left to the caller because only the member themself may set them.
 */
export function profileUpdateFromDto(dto: UpsertMyProfileDto): ProfileUpdateData {
  return {
    age: dto.age,
    weightKg: dto.weightKg,
    targetWeightKg: dto.targetWeightKg,
    heightCm: dto.heightCm,
    sex: dto.sex,
    unitSystem: dto.unitSystem,
    fitnessGoal: dto.fitnessGoal,
    activityLevel: dto.activityLevel,
    daysPerWeek: dto.daysPerWeek,
    experienceLevel: dto.experienceLevel,
    preferredStyle: dto.preferredStyle,
    dietType: dto.dietType,
    injuries: dto.injuries,
    onboardingDone: dto.onboardingDone,
  };
}

/**
 * The fields staff may change on a member's profile: the training details, but not
 * the member's own health fields, sex or display preference.
 */
export function staffProfileUpdateFromDto(dto: UpsertMyProfileDto): ProfileUpdateData {
  const data = profileUpdateFromDto(dto);
  delete data.sex;
  delete data.unitSystem;
  return data;
}

export interface HealthFields {
  healthCaution: boolean;
  healthDataConsentAt: Date | null;
}

/**
 * The profile as staff see it: the training profile without the member's health
 * flag or consent record.
 */
export function staffVisibleProfile<T extends HealthFields>(profile: T): Omit<T, keyof HealthFields> {
  const visible: Partial<T> = { ...profile };
  delete visible.healthCaution;
  delete visible.healthDataConsentAt;
  return visible as Omit<T, keyof HealthFields>;
}
