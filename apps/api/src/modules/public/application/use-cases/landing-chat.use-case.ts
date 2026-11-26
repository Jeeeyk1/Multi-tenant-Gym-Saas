import { Inject, Injectable } from '@nestjs/common';
import { RateLimiterService } from '../../../../common/rate-limiter/rate-limiter.service';
import { TooManyRequestsError } from '../../../../common/errors';
import { AI_PROVIDER_PORT, AiProviderPort } from '../../../../common/adapters/ai/ai-provider.port';
import { PublicRepository } from '../../infrastructure/persistence/public.repository';

interface PricingPlan {
  name: string;
  description: string | null;
  priceMonthly: { toString(): string } | number;
  priceYearly: { toString(): string } | number | null;
  memberLimit: number | null;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Pricing is added from the active plans (pricingSection) so it can't drift from the landing page.
const SYSTEM_PROMPT = `You are Maya, the friendly assistant on the FitOps website. FitOps is gym management software, a VerSolutions product. You help gym owners understand FitOps and answer their questions. Be concise, helpful and conversational. You can respond in Filipino or English depending on how the user writes.

## About FitOps

FitOps runs check-ins, renewals and member engagement for gyms, and gives members an app with the gym's own logo and colors (members see the gym's brand, not FitOps).

## Features (every feature is included on every plan)

- Renewals: see every membership due and expired, and remind members in one tap
- Smart check-ins: QR code and manual check-ins, live attendance, duplicate guard
- AI Insights: owners ask questions about their gym data in plain language
- Analytics: revenue trends, peak hours and retention rates
- Member management: full profiles, photo ID and membership cards
- Plans and billing: monthly, annual, student and day passes
- Announcements: by gym or across all locations
- Community chat, moderated by the gym's staff
- Leaderboards and badges: weekly and monthly rankings, points from check-ins and activities
- Branches and roles: several gyms in one organization, with owner, manager and staff access
- Member app for iOS and Android: check in, membership card and days left, AI Coach (workouts with exercise swaps, meal plans, meal advice), leaderboard and badges
- The staff dashboard runs in a web browser on a laptop or tablet

## Free trial

- 14 days, every feature included, no credit card needed
- To keep going, the gym chooses monthly or yearly billing
- Free setup assistance and free migration help: send us your member list and we import it during setup
- We aim to have every gym live within a day

## How to get started

1. Fill in the free trial form on this page (name, gym name, mobile number, email)
2. We set up the account and send the gym code
3. Upload your logo, pick your color, add your plans and prices
4. Invite owners, managers and front-desk staff
5. Members download the app, enter the gym code and check in

## Founding gyms

The first 10 gyms pay 50% less every month for 12 months on any plan, plus free setup and a direct line to the team building FitOps. Monthly billing only.

## Contact

- Email: hello@getversolutions.com
- For a demo, or more than 500 members (custom plan), email us

## Rules

- If you don't know something, say so and direct them to hello@getversolutions.com
- Don't make up features, prices, discounts, integrations or customers that aren't listed here
- Don't promise payment methods; for questions about how to pay, direct them to hello@getversolutions.com
- Keep responses short, 2-4 sentences, unless the user asks for details
- If someone asks about something unrelated to FitOps, politely redirect them`;

const PRICING_UNAVAILABLE =
  '## Pricing\n\nPricing is not available right now. Ask them to check the Pricing section of this page or email hello@getversolutions.com.';

function peso(amount: number): string {
  return `\u20B1${amount.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;
}

export function pricingSection(plans: PricingPlan[]): string {
  if (plans.length === 0) return PRICING_UNAVAILABLE;

  const lines = plans.map((plan) => {
    const monthly = Number(plan.priceMonthly);
    const parts = [`- ${plan.name}: ${peso(monthly)}/month`];
    if (plan.priceYearly != null) parts.push(`or ${peso(Number(plan.priceYearly))}/year`);
    if (plan.memberLimit != null) parts.push(`up to ${plan.memberLimit} active members`);
    if (plan.description) parts.push(plan.description);
    return parts.join(', ');
  });

  return [
    '## Pricing (Philippine peso, prices include VAT)',
    '',
    'Plans differ only by gym size; every plan includes every feature.',
    ...lines,
    '- Extra branches: +\u20B12,499/month each',
  ].join('\n');
}

const BURST_LIMIT = 10;
const BURST_WINDOW_SECONDS = 60;
const DAILY_LIMIT = 100;
const DAILY_WINDOW_SECONDS = 24 * 60 * 60;

@Injectable()
export class LandingChatUseCase {
  constructor(
    @Inject(AI_PROVIDER_PORT) private readonly ai: AiProviderPort,
    private readonly rateLimiter: RateLimiterService,
    private readonly plans: PublicRepository,
  ) {}

  async execute(message: string, history: ChatMessage[], ip: string): Promise<string> {
    // Every call costs LLM tokens and the endpoint is public — cap it per IP.
    const [withinBurst, withinDaily] = await Promise.all([
      this.rateLimiter.hit(`landing-chat:burst:${ip}`, BURST_LIMIT, BURST_WINDOW_SECONDS),
      this.rateLimiter.hit(`landing-chat:daily:${ip}`, DAILY_LIMIT, DAILY_WINDOW_SECONDS),
    ]);
    if (!withinBurst || !withinDaily) {
      throw new TooManyRequestsError('Too many messages — please try again later');
    }

    const historyText = history
      .slice(-6)
      .map((m) => `${m.role === 'user' ? 'User' : 'Maya'}: ${m.content}`)
      .join('\n');

    const plans = await this.plans.listActivePlans().catch(() => []);

    const prompt = [
      SYSTEM_PROMPT,
      pricingSection(plans),
      historyText ? `\n## Conversation so far\n${historyText}` : '',
      `\nUser: ${message}`,
      `Maya:`,
    ]
      .filter(Boolean)
      .join('\n');

    const result = await this.ai.chat(prompt, 400);
    return result.text.trim();
  }
}
