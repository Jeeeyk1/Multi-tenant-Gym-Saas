import { Logger } from '@nestjs/common';
import { AiAllowanceService } from './ai-allowance.service';
import type { AiUsageRepository, GymAiPlan } from '../infrastructure/ai-usage.repository';
import type { AuthenticatedUser } from '../../../common/types/auth.types';

const repo = {
  findGymAiPlan: jest.fn(),
  sumCost: jest.fn(),
  countToday: jest.fn(),
  record: jest.fn(),
} as unknown as jest.Mocked<AiUsageRepository>;

const plan: GymAiPlan = {
  organizationId: 'org-1',
  timezone: 'Asia/Manila',
  periodStart: new Date('2026-11-01T00:00:00Z'),
  periodEnd: new Date('2026-11-30T16:00:00Z'),
  assistantIncluded: true,
  assistantCapUsdMicros: 2_500_000,
  memberCapUsdMicros: 3_500_000,
};
const owner: AuthenticatedUser = { sub: 'u-owner', type: 'gym', gymId: 'gym-1', roles: ['OWNER'], permissions: [] };
const staff: AuthenticatedUser = { sub: 'u-staff', type: 'gym', gymId: 'gym-1', roles: ['STAFF'], permissions: [] };

describe('AiAllowanceService', () => {
  const service = () => new AiAllowanceService(repo);

  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    repo.findGymAiPlan.mockResolvedValue(plan);
    repo.sumCost.mockResolvedValue(0);
    repo.countToday.mockResolvedValue(0);
  });

  it('lets a question through when there is allowance and daily questions left', async () => {
    await expect(service().assertAssistantAvailable('gym-1', staff)).resolves.toBe(plan);
  });

  it("refuses when the plan doesn't include the assistant, or there's no subscription", async () => {
    repo.findGymAiPlan.mockResolvedValueOnce({ ...plan, assistantIncluded: false });
    await expect(service().assertAssistantAvailable('gym-1', owner)).rejects.toMatchObject({ code: 'FEATURE_NOT_AVAILABLE' });
    repo.findGymAiPlan.mockResolvedValueOnce(null);
    await expect(service().assertAssistantAvailable('gym-1', owner)).rejects.toMatchObject({ code: 'FEATURE_NOT_AVAILABLE' });
  });

  it("stops when the gym's monthly assistant allowance is used up, with the reset date", async () => {
    repo.sumCost.mockResolvedValue(2_500_000);
    await expect(service().assertAssistantAvailable('gym-1', owner)).rejects.toMatchObject({
      code: 'AI_ALLOWANCE_EXCEEDED',
      statusCode: 429,
      message: expect.stringContaining('2026-12-01'),
    });
  });

  it('applies the daily limit per person: 15 for staff, 40 for owners', async () => {
    repo.countToday.mockResolvedValue(15);
    await expect(service().assertAssistantAvailable('gym-1', staff)).rejects.toMatchObject({ code: 'AI_DAILY_LIMIT_REACHED' });
    await expect(service().assertAssistantAvailable('gym-1', owner)).resolves.toBe(plan);
    repo.countToday.mockResolvedValue(40);
    await expect(service().assertAssistantAvailable('gym-1', owner)).rejects.toMatchObject({ code: 'AI_DAILY_LIMIT_REACHED' });
  });

  it("pauses member AI when the gym's member pool is used up, and fails closed without a plan", async () => {
    await expect(service().assertMemberPoolAvailable('gym-1')).resolves.toBeUndefined();
    repo.sumCost.mockResolvedValue(3_500_000);
    await expect(service().assertMemberPoolAvailable('gym-1')).rejects.toMatchObject({ code: 'GYM_AI_ALLOWANCE_EXCEEDED' });
    repo.findGymAiPlan.mockResolvedValue(null);
    await expect(service().assertMemberPoolAvailable('gym-1')).rejects.toMatchObject({ code: 'GYM_AI_ALLOWANCE_EXCEEDED' });
  });

  it('records an assistant question with its cost', async () => {
    await service().recordAssistant(plan, 'gym-1', 'u-owner', { model: 'claude-haiku-4-5', inputTokens: 1000, outputTokens: 500 });
    expect(repo.record).toHaveBeenCalledWith(
      expect.objectContaining({ featureKey: 'ai_insights', organizationId: 'org-1', costUsdMicros: 3500 }),
    );
  });

  it('reports usage as a share of the cap', async () => {
    repo.sumCost.mockResolvedValue(625_000);
    repo.countToday.mockResolvedValue(3);
    const usage = await service().assistantUsage('gym-1', staff);
    expect(usage).toMatchObject({
      pool: { usedPct: 25, capUsdMicros: 2_500_000, resetsOn: '2026-12-01' },
      today: { used: 3, limit: 15 },
    });
  });

  it("returns no assistant usage when the plan doesn't include the assistant", async () => {
    repo.findGymAiPlan.mockResolvedValueOnce({ ...plan, assistantIncluded: false });
    await expect(service().assistantUsage('gym-1', staff)).resolves.toBeNull();
  });
});
