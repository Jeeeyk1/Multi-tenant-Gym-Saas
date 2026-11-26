import { Logger } from '@nestjs/common';
import { MemberAiLimitsService } from './member-ai-limits.service';
import type { AiRepository } from '../infrastructure/persistence/ai.repository';
import { AiFeature } from '../../../common/enums';
import { MONTHLY_MEMBER_AI_LIMITS } from '../domain/member-ai-limits';
import type { AiAllowanceService } from '../../ai-usage/application/ai-allowance.service';

const mockRepo = {
  monthBounds: jest.fn(),
  countMemberUsage: jest.fn(),
  reserveMemberUsage: jest.fn(),
  completeUsage: jest.fn(),
  releaseUsage: jest.fn(),
} as unknown as jest.Mocked<AiRepository>;
const allowance = { assertMemberPoolAvailable: jest.fn() } as unknown as jest.Mocked<AiAllowanceService>;

const ctx = { organizationId: 'org-1', userId: 'user-1', gymId: 'gym-1', timezone: 'Asia/Manila' };
const month = { start: new Date('2026-11-30T16:00:00Z'), end: new Date('2026-12-31T16:00:00Z') };

describe('MemberAiLimitsService', () => {
  let service: MemberAiLimitsService;

  beforeEach(() => {
    jest.resetAllMocks();
    mockRepo.monthBounds.mockResolvedValue(month);
    allowance.assertMemberPoolAvailable.mockResolvedValue(undefined);
    service = new MemberAiLimitsService(mockRepo, allowance);
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
      call.mockResolvedValue({ text: '{}', tokensUsed: 321, inputTokens: 300, outputTokens: 21, model: 'openai/gpt-oss-120b' });
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
      expect(mockRepo.completeUsage).toHaveBeenCalledWith('usage-1', expect.objectContaining({ inputTokens: 300, outputTokens: 21 }));
      expect(result.model).toBe('openai/gpt-oss-120b');
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

    it("stops before reserving when the gym's member AI allowance is used up", async () => {
      allowance.assertMemberPoolAvailable.mockRejectedValue(Object.assign(new Error('paused'), { code: 'GYM_AI_ALLOWANCE_EXCEEDED' }));
      await expect(service.run(ctx, AiFeature.WORKOUT_PLAN, call)).rejects.toMatchObject({ code: 'GYM_AI_ALLOWANCE_EXCEEDED' });
      expect(mockRepo.reserveMemberUsage).not.toHaveBeenCalled();
      expect(call).not.toHaveBeenCalled();
    });

    it('keeps the answer when recording the usage fails, and logs it', async () => {
      const logError = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
      mockRepo.reserveMemberUsage.mockResolvedValue('usage-1');
      mockRepo.completeUsage.mockRejectedValue(new Error('db blip'));
      await expect(service.run(ctx, AiFeature.WORKOUT_PLAN, call)).resolves.toMatchObject({ text: '{}' });
      expect(logError).toHaveBeenCalledWith(expect.stringContaining('member AI usage not recorded'), expect.any(String));
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
