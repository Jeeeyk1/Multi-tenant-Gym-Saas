import {
  ActivityLevel,
  FitnessDirection,
  FitnessGoal,
  FitnessPlanInputProblem,
  GoalPace,
  PaceUnavailableReason,
  Sex,
} from '../../../common/enums';
import {
  addDays,
  bmrKcal,
  buildFitnessPlanOptions,
  findInputProblem,
  type FitnessPlanInput,
} from './fitness-plan.calculator';

function input(overrides: Partial<FitnessPlanInput> = {}): FitnessPlanInput {
  return {
    sex: Sex.MALE,
    age: 30,
    heightCm: 180,
    weightKg: 80,
    targetWeightKg: 70,
    activityLevel: ActivityLevel.MODERATE,
    fitnessGoal: FitnessGoal.LOSE_WEIGHT,
    healthCaution: false,
    today: '2026-12-01',
    ...overrides,
  };
}

function option(result: ReturnType<typeof buildFitnessPlanOptions>, pace: GoalPace) {
  const found = result.options.find((o) => o.pace === pace);
  if (!found) throw new Error(`no ${pace} option`);
  return found;
}

describe('fitness-plan calculator', () => {
  describe('BMR and TDEE', () => {
    it('uses Mifflin–St Jeor with the sex constant', () => {
      // 10·80 + 6.25·180 − 5·30
      expect(bmrKcal(input())).toBe(1775 + 5);
      expect(bmrKcal(input({ sex: Sex.FEMALE }))).toBe(1775 - 161);
      expect(bmrKcal(input({ sex: Sex.UNSPECIFIED }))).toBe(1775 - 78);
    });

    it('multiplies BMR by the activity factor', () => {
      const result = buildFitnessPlanOptions(input());
      expect(result.bmrKcal).toBe(1780);
      expect(result.tdeeKcal).toBe(2759); // 1780 × 1.55
      expect(result.maintenance.kcal).toBe(2760);
    });
  });

  describe('weight loss', () => {
    const result = buildFitnessPlanOptions(input());

    it('offers three paces, recommending BALANCED', () => {
      expect(result.direction).toBe(FitnessDirection.LOSS);
      expect(result.options.map((o) => o.pace)).toEqual([GoalPace.STEADY, GoalPace.BALANCED, GoalPace.FAST]);
      expect(result.options.every((o) => o.available)).toBe(true);
      expect(result.recommendedPace).toBe(GoalPace.BALANCED);
      expect(result.adviseProfessional).toBe(false);
    });

    it('turns each pace into a deficit, a weekly rate and a goal date', () => {
      expect(option(result, GoalPace.STEADY)).toMatchObject({
        weeklyRateKg: -0.25,
        weeksToGoal: 40,
        targetDate: '2027-09-07',
      });
      expect(option(result, GoalPace.BALANCED)).toMatchObject({
        weeklyRateKg: -0.5,
        weeksToGoal: 20,
        targetDate: '2027-04-20',
      });
      expect(option(result, GoalPace.FAST)).toMatchObject({
        weeklyRateKg: -0.75,
        weeksToGoal: 14,
        targetDate: '2027-03-09',
      });
    });

    it('splits calories into macros', () => {
      expect(option(result, GoalPace.BALANCED).targets).toEqual({
        kcal: 2210,
        proteinG: 144, // 1.8 g/kg
        fatG: 61, // 25% of kcal
        carbsG: 271, // the remainder
        waterMl: 2800,
      });
    });

    it('keeps calories at or above the floor and disables paces that cannot go faster', () => {
      const small = buildFitnessPlanOptions(
        input({
          sex: Sex.FEMALE,
          age: 50,
          heightCm: 155,
          weightKg: 60,
          targetWeightKg: 52,
          activityLevel: ActivityLevel.SEDENTARY,
        }),
      );
      expect(option(small, GoalPace.STEADY)).toMatchObject({
        available: true,
        targets: expect.objectContaining({ kcal: 1200 }),
      });
      expect(option(small, GoalPace.BALANCED)).toMatchObject({
        available: false,
        unavailableReason: PaceUnavailableReason.SAFE_LIMIT_REACHED,
      });
      expect(option(small, GoalPace.FAST).available).toBe(false);
      expect(small.recommendedPace).toBe(GoalPace.STEADY);
      for (const o of small.options) expect(o.targets.kcal).toBeGreaterThanOrEqual(1200);
    });

    it('never rounds calories below a BMR floor', () => {
      // BMR = 1784 (> 1500 male floor). Rounding to the nearest 10 would give 1780.
      const result = buildFitnessPlanOptions(
        input({ weightKg: 80.4, activityLevel: ActivityLevel.SEDENTARY }),
      );
      expect(result.bmrKcal).toBe(1784);
      expect(option(result, GoalPace.BALANCED).targets.kcal).toBe(1790);
      for (const o of result.options) expect(o.targets.kcal).toBeGreaterThanOrEqual(1784);
    });

    it('caps the weekly loss at 1% of bodyweight', () => {
      const light = buildFitnessPlanOptions(input({ weightKg: 50, heightCm: 160, targetWeightKg: 48 }));
      expect(option(light, GoalPace.BALANCED).weeklyRateKg).toBeGreaterThanOrEqual(-0.5);
      expect(option(light, GoalPace.FAST)).toMatchObject({
        available: false,
        unavailableReason: PaceUnavailableReason.SAFE_LIMIT_REACHED,
      });
    });

    it('scales protein to a BMI-25 weight when BMI is 30 or more', () => {
      const result = buildFitnessPlanOptions(input({ heightCm: 170, weightKg: 110, targetWeightKg: 90 }));
      // 25 × 1.7² = 72.25 kg reference → 1.8 × 72.25
      expect(option(result, GoalPace.BALANCED).targets.proteinG).toBe(130);
    });

    it('gives no goal date when there is no target weight', () => {
      const result = buildFitnessPlanOptions(input({ targetWeightKg: null }));
      expect(option(result, GoalPace.BALANCED)).toMatchObject({ weeksToGoal: null, targetDate: null });
    });

    it('falls back to maintenance when a health caution was reported', () => {
      const result = buildFitnessPlanOptions(input({ healthCaution: true }));
      expect(result.direction).toBe(FitnessDirection.MAINTAIN);
      expect(result.options).toEqual([]);
      expect(result.recommendedPace).toBeNull();
      expect(result.adviseProfessional).toBe(true);
    });
  });

  describe('weight gain', () => {
    const gain = input({ fitnessGoal: FitnessGoal.BUILD_MUSCLE, weightKg: 70, targetWeightKg: 75 });

    it('adds a surplus per pace and uses lean-gain rates', () => {
      const result = buildFitnessPlanOptions(gain);
      expect(result.direction).toBe(FitnessDirection.GAIN);
      const tdee = result.maintenance.kcal;
      expect(option(result, GoalPace.STEADY).targets.kcal).toBe(tdee + 150);
      expect(option(result, GoalPace.FAST).targets.kcal).toBe(tdee + 400);
      expect(option(result, GoalPace.BALANCED).weeklyRateKg).toBe(0.08); // 0.35 kg/month
      expect(option(result, GoalPace.BALANCED).targets.proteinG).toBe(112); // 1.6 g/kg
    });

    it('limits members under 18 to the gentlest pace', () => {
      const result = buildFitnessPlanOptions({ ...gain, age: 16 });
      expect(option(result, GoalPace.STEADY).available).toBe(true);
      expect(option(result, GoalPace.BALANCED).unavailableReason).toBe(PaceUnavailableReason.UNDER_18);
      expect(option(result, GoalPace.FAST).unavailableReason).toBe(PaceUnavailableReason.UNDER_18);
      expect(result.recommendedPace).toBe(GoalPace.STEADY);
      expect(result.adviseProfessional).toBe(true);
    });

    it('limits members with a health caution to the gentlest pace', () => {
      const result = buildFitnessPlanOptions({ ...gain, healthCaution: true });
      expect(option(result, GoalPace.FAST).unavailableReason).toBe(PaceUnavailableReason.HEALTH_CAUTION);
      expect(result.recommendedPace).toBe(GoalPace.STEADY);
    });
  });

  describe('direction', () => {
    it('maintains when the goal has no direction and there is no target', () => {
      const result = buildFitnessPlanOptions(input({ fitnessGoal: FitnessGoal.GET_FIT, targetWeightKg: null }));
      expect(result.direction).toBe(FitnessDirection.MAINTAIN);
      expect(result.options).toEqual([]);
    });

    it('treats a target within 0.5 kg as no target', () => {
      const result = buildFitnessPlanOptions(input({ fitnessGoal: FitnessGoal.STAY_HEALTHY, targetWeightKg: 80.4 }));
      expect(result.direction).toBe(FitnessDirection.MAINTAIN);
    });

    it('follows the target weight for goals without a direction', () => {
      expect(
        buildFitnessPlanOptions(input({ fitnessGoal: FitnessGoal.GET_FIT, targetWeightKg: 75 })).direction,
      ).toBe(FitnessDirection.LOSS);
      expect(
        buildFitnessPlanOptions(input({ fitnessGoal: FitnessGoal.GET_FIT, targetWeightKg: 85 })).direction,
      ).toBe(FitnessDirection.GAIN);
    });
  });

  describe('findInputProblem', () => {
    it('accepts consistent inputs', () => {
      expect(findInputProblem(input())).toBeNull();
    });

    it('rejects a target that contradicts the goal', () => {
      expect(findInputProblem(input({ targetWeightKg: 85 }))).toBe(
        FitnessPlanInputProblem.TARGET_CONFLICTS_WITH_GOAL,
      );
      expect(findInputProblem(input({ fitnessGoal: FitnessGoal.BUILD_MUSCLE, targetWeightKg: 75 }))).toBe(
        FitnessPlanInputProblem.TARGET_CONFLICTS_WITH_GOAL,
      );
    });

    it('requires a target weight for weight loss', () => {
      expect(findInputProblem(input({ targetWeightKg: null }))).toBe(
        FitnessPlanInputProblem.TARGET_WEIGHT_REQUIRED,
      );
    });

    it('rejects values outside the supported ranges', () => {
      expect(findInputProblem(input({ age: 11 }))).toBe(FitnessPlanInputProblem.PROFILE_OUT_OF_RANGE);
      expect(findInputProblem(input({ heightCm: 110 }))).toBe(FitnessPlanInputProblem.PROFILE_OUT_OF_RANGE);
      expect(findInputProblem(input({ weightKg: 350 }))).toBe(FitnessPlanInputProblem.PROFILE_OUT_OF_RANGE);
      expect(findInputProblem(input({ targetWeightKg: 25 }))).toBe(FitnessPlanInputProblem.PROFILE_OUT_OF_RANGE);
    });

    it('rejects weight loss for an underweight member', () => {
      expect(findInputProblem(input({ weightKg: 55, targetWeightKg: 50 }))).toBe(
        FitnessPlanInputProblem.LOSS_NOT_RECOMMENDED,
      );
    });

    it('rejects a target below the healthy BMI range', () => {
      expect(findInputProblem(input({ targetWeightKg: 58 }))).toBe(
        FitnessPlanInputProblem.TARGET_BELOW_HEALTHY_RANGE,
      );
    });
  });

  describe('addDays', () => {
    it('crosses month, year and leap-day boundaries', () => {
      expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
      expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    });
  });
});
