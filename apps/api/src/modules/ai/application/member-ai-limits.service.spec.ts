import { MemberAiLimitsService } from './member-ai-limits.service';
import type { AiRepository } from '../infrastructure/persistence/ai.repository';
import { AiFeature } from '../../../common/enums';
import { MONTHLY_MEMBER_AI_LIMITS } from '../domain/member-ai-limits';

const mockRepo = {
  monthBounds: jest.fn(),
  countMemberUsage: jest.fn(),
  reserveMemberUsage: jest.fn(),
  completeUsage: jest.fn(),
  releaseUsage: jest.fn(),
} as unknown as jest.Mocked<AiRepository>;

const ctx = { organizationId: 'org-1', userId: 'user-1', gymId: 'gym-1', timezone: 'Asia/Manila' };
const month = { start: new Date('2026-11-30T16:00:00Z'), end: new Date('2026-12-31T16:00:00Z') };

describe('MemberAiLimitsService', () => {
  let service: MemberAiLimitsService;

  beforeEach(() => {
    jest.resetAllMocks();
    mockRepo.monthBounds.mockResolvedValue(month);
    service = new MemberAiLimitsService(mockRepo);
  });

  it("counts this member's usage since the start of the gym's month", async () => {
    mockRepo.countMemberUsage.mockResolvedValue(new Map([[AiFeature.MEAL_PHOTO, 5]]));
    const usage = await service.getUsage(ctx);

    expect(mockRepo.monthBounds).toHaveBeenCalledWith('Asia/Manila');
    expect(mockRepo.countMemberUsage).toHaveBeenCalledWith('user-1', 'gym-1', month.start);
    expect(usage.resetsAt).toBe(month.end);
    expect(usage.features.find((f) => f.feature === AiFeature.MEAL_PHOTO)).toEqual({
      feature: AiFeature.MEAL_PHOTO,
      used: 5,
      limit: MONTHLY_MEMBER_AI_LIMITS[AiFeature.MEAL_PHOTO],
      remaining: MONTHLY_MEMBER_AI_LIMITS[AiFeature.MEAL_PHOTO] - 5,
    });
    expect(usage.features).toHaveLength(Object.values(AiFeature).length);
  });

  describe('run', () => {
    const call = jest.fn();

    beforeEach(() => {
      call.mockResolvedValue({ text: '{}', tokensUsed: 321 });
    });

    it('reserves a slot under the monthly limit, runs the call and records its tokens', async () => {
      mockRepo.reserveMemberUsage.mockResolvedValue('usage-1');
      const result = await service.run(ctx, AiFeature.WORKOUT_PLAN, call);

      expect(mockRepo.reserveMemberUsage).toHaveBeenCalledWith(
        ctx,
        AiFeature.WORKOUT_PLAN,
        MONTHLY_MEMBER_AI_LIMITS[AiFeature.WORKOUT_PLAN],
        month.start,
      );
      expect(mockRepo.completeUsage).toHaveBeenCalledWith('usage-1', 321);
      expect(result.tokensUsed).toBe(321);
    });

    it('refuses without calling the provider once the limit is used up, giving the local reset date', async () => {
      mockRepo.reserveMemberUsage.mockResolvedValue(null);
      await expect(service.run(ctx, AiFeature.WORKOUT_PLAN, call)).rejects.toMatchObject({
        code: 'MEMBER_AI_LIMIT_REACHED',
        statusCode: 429,
        // 2026-12-31T16:00Z is midnight on Jan 1 in Manila.
        message: expect.stringContaining('2027-01-01'),
      });
      expect(call).not.toHaveBeenCalled();
    });

    it('releases the slot when the provider call fails, since nothing was billed', async () => {
      mockRepo.reserveMemberUsage.mockResolvedValue('usage-1');
      call.mockRejectedValue(new Error('provider down'));
      await expect(service.run(ctx, AiFeature.MEAL_TEXT, call)).rejects.toThrow('provider down');
      expect(mockRepo.releaseUsage).toHaveBeenCalledWith('usage-1');
      expect(mockRepo.completeUsage).not.toHaveBeenCalled();
    });
  });
});
