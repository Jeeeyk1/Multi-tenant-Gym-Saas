import { AnswerQueryUseCase } from './answer-query.use-case';
import type { LlmPort } from '../ports/llm.port';
import type { ToolRegistry } from '../tools/tool-registry';
import type { EntitlementsService } from '../entitlements.service';
import type { RateLimiterService } from '../../../../common/rate-limiter/rate-limiter.service';
import type { InsightsRepository, Entitlement } from '../../infrastructure/persistence/insights.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

const llm = { complete: jest.fn() } as unknown as jest.Mocked<LlmPort>;
const tools = {
  systemPrompt: jest.fn(() => 'system'),
  schemas: jest.fn(() => []),
  execute: jest.fn(),
  stepLabel: jest.fn(() => 'Calculating metric'),
} as unknown as jest.Mocked<ToolRegistry>;
const entitlements = { check: jest.fn() } as unknown as jest.Mocked<EntitlementsService>;
const rateLimiter = { hit: jest.fn() } as unknown as jest.Mocked<RateLimiterService>;
const repo = { recordUsage: jest.fn() } as unknown as jest.Mocked<InsightsRepository>;

const entitlement: Entitlement = {
  subscriptionId: 'sub-1',
  organizationId: 'org-1',
  aiIncluded: true,
  quota: 200000,
  used: 0,
};

const manager: AuthenticatedUser = {
  type: 'gym',
  sub: 'staff-1',
  gymId: 'gym-1',
  roles: ['MANAGER'],
  permissions: ['insights.query'],
};

describe('AnswerQueryUseCase', () => {
  let useCase: AnswerQueryUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new AnswerQueryUseCase(llm, tools, entitlements, rateLimiter, repo);
    rateLimiter.hit.mockResolvedValue(true);
    entitlements.check.mockResolvedValue(entitlement);
    tools.execute.mockResolvedValue({
      content: { type: 'tool_result', toolUseId: 't1', content: '{"value":5}' },
      data: { value: 5 },
      isError: false,
    });
    repo.recordUsage.mockResolvedValue(undefined);
  });

  it('runs the tool loop, injects gymId, and records token usage', async () => {
    llm.complete
      .mockResolvedValueOnce({
        message: { role: 'assistant', content: [{ type: 'tool_use', id: 't1', name: 'query_metric', input: {} }] },
        stopReason: 'tool_use',
        tokensUsed: 10,
      })
      .mockResolvedValueOnce({
        message: { role: 'assistant', content: [{ type: 'text', text: 'There were 5 check-ins today.' }] },
        stopReason: 'end_turn',
        tokensUsed: 8,
      });

    const result = await useCase.execute('gym-1', { message: 'how many check-ins today?' }, manager);

    expect(tools.execute).toHaveBeenCalledWith(
      expect.objectContaining({ id: 't1' }),
      { gymId: 'gym-1', caller: manager },
    );
    expect(result).toEqual({
      answer: 'There were 5 check-ins today.',
      toolsUsed: ['query_metric'],
      steps: [{ tool: 'query_metric', label: 'Calculating metric', data: { value: 5 } }],
    });
    expect(repo.recordUsage).toHaveBeenCalledWith(entitlement, 'gym-1', 'staff-1', 18);
  });

  it('omits a step for a tool call that errored, but keeps looping', async () => {
    llm.complete
      .mockResolvedValueOnce({
        message: { role: 'assistant', content: [{ type: 'tool_use', id: 't1', name: 'find_member', input: {} }] },
        stopReason: 'tool_use',
        tokensUsed: 5,
      })
      .mockResolvedValueOnce({
        message: { role: 'assistant', content: [{ type: 'text', text: 'I could not find that member.' }] },
        stopReason: 'end_turn',
        tokensUsed: 4,
      });
    tools.execute.mockResolvedValueOnce({
      content: { type: 'tool_result', toolUseId: 't1', content: 'not found', isError: true },
      data: null,
      isError: true,
    });

    const result = await useCase.execute('gym-1', { message: 'find Bob' }, manager);

    expect(result.toolsUsed).toEqual(['find_member']);
    expect(result.steps).toEqual([]);
  });

  it('blocks callers without insights.query before touching the model', async () => {
    const frontDesk: AuthenticatedUser = { ...manager, permissions: ['checkins.manage'] };
    await expect(useCase.execute('gym-1', { message: 'hi' }, frontDesk)).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
    expect(entitlements.check).not.toHaveBeenCalled();
    expect(llm.complete).not.toHaveBeenCalled();
  });

  it('rejects when the per-user rate limit is exceeded, before any DB or model call', async () => {
    rateLimiter.hit.mockResolvedValue(false);
    await expect(useCase.execute('gym-1', { message: 'hi' }, manager)).rejects.toMatchObject({
      code: 'RATE_LIMITED',
    });
    expect(entitlements.check).not.toHaveBeenCalled();
    expect(llm.complete).not.toHaveBeenCalled();
  });

  it('does not call the model when entitlement check fails', async () => {
    entitlements.check.mockRejectedValue(Object.assign(new Error('blocked'), { code: 'FEATURE_NOT_AVAILABLE' }));
    await expect(useCase.execute('gym-1', { message: 'hi' }, manager)).rejects.toThrow('blocked');
    expect(llm.complete).not.toHaveBeenCalled();
  });

  it('rejects a gym-level caller targeting another gym', async () => {
    await expect(useCase.execute('gym-2', { message: 'hi' }, manager)).rejects.toMatchObject({
      code: 'GYM_ACCESS_DENIED',
    });
  });
});
