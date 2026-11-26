import { LandingChatUseCase, pricingSection } from './landing-chat.use-case';
import type { AiProviderPort } from '../../../../common/adapters/ai/ai-provider.port';
import type { RateLimiterService } from '../../../../common/rate-limiter/rate-limiter.service';
import type { PublicRepository } from '../../infrastructure/persistence/public.repository';

const standard = {
  name: 'Standard',
  description: 'For established neighborhood gyms.',
  priceMonthly: '3999',
  priceYearly: '39990',
  memberLimit: 200,
};

describe('pricingSection', () => {
  it('lists each plan with monthly and yearly prices and the member limit', () => {
    const text = pricingSection([standard]);
    expect(text).toContain('- Standard: ₱3,999/month, or ₱39,990/year, up to 200 active members');
    expect(text).toContain('every plan includes every feature');
  });

  it('tells Maya pricing is unavailable when there are no plans', () => {
    expect(pricingSection([])).toContain('Pricing is not available right now');
  });
});

describe('LandingChatUseCase', () => {
  const ai = { chat: jest.fn() } as unknown as jest.Mocked<AiProviderPort>;
  const rateLimiter = { hit: jest.fn() } as unknown as jest.Mocked<RateLimiterService>;
  const plans = { listActivePlans: jest.fn() } as unknown as jest.Mocked<PublicRepository>;
  let useCase: LandingChatUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new LandingChatUseCase(ai, rateLimiter, plans);
    rateLimiter.hit.mockResolvedValue(true);
    ai.chat.mockResolvedValue({ text: ' Hi! ' } as never);
  });

  it('answers as FitOps with the live plans in the prompt', async () => {
    plans.listActivePlans.mockResolvedValue([standard] as never);
    await expect(useCase.execute('How much?', [], '1.2.3.4')).resolves.toBe('Hi!');
    const prompt = ai.chat.mock.calls[0][0];
    expect(prompt).toContain('FitOps');
    expect(prompt).not.toContain('LiftHub');
    expect(prompt).toContain('₱3,999/month');
  });

  it('still answers when the plans cannot be loaded', async () => {
    plans.listActivePlans.mockRejectedValue(new Error('db down'));
    await useCase.execute('How much?', [], '1.2.3.4');
    expect(ai.chat.mock.calls[0][0]).toContain('Pricing is not available right now');
  });

  it('rejects with 429 once the IP is rate-limited', async () => {
    rateLimiter.hit.mockResolvedValue(false);
    await expect(useCase.execute('Hi', [], '1.2.3.4')).rejects.toMatchObject({ statusCode: 429 });
    expect(ai.chat).not.toHaveBeenCalled();
  });
});
