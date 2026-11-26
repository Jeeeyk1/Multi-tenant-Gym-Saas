import { UpsertMyProfileUseCase } from './upsert-my-profile.use-case';
import { UpsertMemberProfileUseCase } from './upsert-member-profile.use-case';
import { GetMemberProfileUseCase } from './get-member-profile.use-case';
import type { MembersRepository } from '../../infrastructure/persistence/members.repository';
import type { GymAuthUser } from '../../../../common/types/auth.types';
import { ActivityLevel, DietType, FitnessGoal, Sex } from '../../../../common/enums';

const mockRepo = {
  findMemberByUserId: jest.fn(),
  findMemberById: jest.fn(),
  findMyProfile: jest.fn(),
  findProfileByMemberId: jest.fn(),
  upsertMyProfile: jest.fn(),
  withdrawHealthDataConsent: jest.fn(),
} as unknown as jest.Mocked<MembersRepository>;

function caller(permissions: string[] = []): GymAuthUser {
  return { sub: 'user-1', type: 'gym', gymId: 'gym-1', roles: [], permissions };
}

const profileRow = {
  memberId: 'member-1',
  age: 30,
  healthCaution: true,
  healthDataConsentAt: new Date('2026-11-01T00:00:00Z'),
};

describe('UpsertMyProfileUseCase', () => {
  let useCase: UpsertMyProfileUseCase;

  beforeEach(() => {
    jest.resetAllMocks();
    mockRepo.findMemberByUserId.mockResolvedValue({ id: 'member-1' } as never);
    mockRepo.upsertMyProfile.mockResolvedValue(profileRow as never);
    useCase = new UpsertMyProfileUseCase(mockRepo);
  });

  it('saves every onboarding field, not just a subset', async () => {
    await useCase.execute(
      'gym-1',
      {
        targetWeightKg: 70,
        daysPerWeek: 4,
        dietType: DietType.VEGETARIAN,
        injuries: 'left knee',
        sex: Sex.FEMALE,
        activityLevel: ActivityLevel.LIGHT,
        fitnessGoal: FitnessGoal.LOSE_WEIGHT,
        healthCaution: true,
      },
      caller(),
    );
    expect(mockRepo.upsertMyProfile).toHaveBeenCalledWith(
      'member-1',
      expect.objectContaining({
        targetWeightKg: 70,
        daysPerWeek: 4,
        dietType: DietType.VEGETARIAN,
        injuries: 'left knee',
        sex: Sex.FEMALE,
        activityLevel: ActivityLevel.LIGHT,
        healthCaution: true,
      }),
    );
  });

  it('passes null through so a goal weight or injury note can be cleared', async () => {
    await useCase.execute('gym-1', { targetWeightKg: null, injuries: null }, caller());
    expect(mockRepo.upsertMyProfile).toHaveBeenCalledWith(
      'member-1',
      expect.objectContaining({ targetWeightKg: null, injuries: null }),
    );
  });

  it('records consent the first time it is given', async () => {
    mockRepo.findMyProfile.mockResolvedValue(null);
    await useCase.execute('gym-1', { healthDataConsent: true }, caller());
    const data = mockRepo.upsertMyProfile.mock.calls[0][1];
    expect(data.healthDataConsentAt).toBeInstanceOf(Date);
  });

  it('keeps the original consent time when consent is given again', async () => {
    mockRepo.findMyProfile.mockResolvedValue(profileRow as never);
    await useCase.execute('gym-1', { healthDataConsent: true }, caller());
    expect(mockRepo.upsertMyProfile.mock.calls[0][1].healthDataConsentAt).toBeUndefined();
  });

  it('withdraws consent, which also removes the saved plans', async () => {
    await useCase.execute('gym-1', { healthDataConsent: false, age: 31 }, caller());
    expect(mockRepo.withdrawHealthDataConsent).toHaveBeenCalledWith(
      'member-1',
      expect.objectContaining({ age: 31 }),
    );
    expect(mockRepo.upsertMyProfile).not.toHaveBeenCalled();
  });

  it('rejects a caller from another gym', async () => {
    await expect(useCase.execute('gym-2', {}, caller())).rejects.toMatchObject({ code: 'GYM_ACCESS_DENIED' });
  });
});

describe('staff access to member profiles', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockRepo.findMemberById.mockResolvedValue({ id: 'member-1' } as never);
    mockRepo.upsertMyProfile.mockResolvedValue(profileRow as never);
    mockRepo.findProfileByMemberId.mockResolvedValue(profileRow as never);
  });

  it('ignores health fields and sex when staff edit a profile, and hides health fields in the response', async () => {
    const result = await new UpsertMemberProfileUseCase(mockRepo).execute(
      'gym-1',
      'member-1',
      { age: 31, sex: Sex.MALE, healthCaution: false, healthDataConsent: true },
      caller(['members.edit']),
    );
    const data = mockRepo.upsertMyProfile.mock.calls[0][1];
    expect(data.age).toBe(31);
    expect(data).not.toHaveProperty('healthCaution');
    expect(data).not.toHaveProperty('healthDataConsentAt');
    expect(data).not.toHaveProperty('sex');
    expect(result).not.toHaveProperty('healthCaution');
    expect(result).not.toHaveProperty('healthDataConsentAt');
  });

  it('hides health fields when staff read a profile', async () => {
    const result = await new GetMemberProfileUseCase(mockRepo).execute(
      'gym-1',
      'member-1',
      caller(['members.details']),
    );
    expect(result).toEqual({ memberId: 'member-1', age: 30 });
  });
});
