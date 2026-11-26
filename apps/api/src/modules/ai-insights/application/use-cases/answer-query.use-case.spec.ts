import { Logger } from '@nestjs/common';
import { AnswerQueryUseCase } from './answer-query.use-case';
import type { LlmPort } from '../ports/llm.port';
import type { ToolRegistry } from '../tools/tool-registry';
import type { AiAllowanceService } from '../../../ai-usage/application/ai-allowance.service';
import type { GymAiPlan } from '../../../ai-usage/infrastructure/ai-usage.repository';
import type { RateLimiterService } from '../../../../common/rate-limiter/rate-limiter.service';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import type { LlmContent, LlmResult } from '../../domain/llm.types';

const llm = { complete: jest.fn() } as unknown as jest.Mocked<LlmPort>;
const tools = {
  systemPrompt: jest.fn(() => 'system'),
  schemas: jest.fn(() => []),
  execute: jest.fn(),
  stepLabel: jest.fn(() => 'Calculating metric'),
} as unknown as jest.Mocked<ToolRegistry>;
const allowance = { assertAssistantAvailable: jest.fn(), recordAssistant: jest.fn() } as unknown as jest.Mocked<AiAllowanceService>;
const rateLimiter = { hit: jest.fn() } as unknown as jest.Mocked<RateLimiterService>;
const plan: GymAiPlan = {
  organizationId: 'org-1',
  timezone: 'Asia/Manila',
  periodStart: new Date('2026-11-01'),
  periodEnd: new Date('2026-12-01'),
  assistantIncluded: true,
  assistantCapUsdMicros: 2_500_000,
  memberCapUsdMicros: 3_500_000,
};
const step = (content: LlmContent[], inputTokens: number, outputTokens: number): LlmResult => ({
  message: { role: 'assistant', content },
  stopReason: 'end_turn',
  inputTokens,
  outputTokens,
  model: 'claude-haiku-4-5',
});

const manager: AuthenticatedUser = {
  type: 'gym',
  sub: 'staff-1',
  gymId: 'gym-1',
  roles: ['OWNER'],
  permissions: ['insights.query'],
};

describe('AnswerQueryUseCase', () => {
  let useCase: AnswerQueryUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new AnswerQueryUseCase(llm, tools, allowance, rateLimiter);
    rateLimiter.hit.mockResolvedValue(true);
    allowance.assertAssistantAvailable.mockResolvedValue(plan);
    tools.execute.mockResolvedValue({
      content: { type: 'tool_result', toolUseId: 't1', content: '{"value":5}' },
      data: { value: 5 },
      isError: false,
    });
    allowance.recordAssistant.mockResolvedValue(undefined);
  });

  it('runs the tool loop, injects gymId, and records token usage', async () => {
    llm.complete
      .mockResolvedValueOnce(step([{ type: 'tool_use', id: 't1', name: 'query_metric', input: {} }], 10, 2))
      .mockResolvedValueOnce(step([{ type: 'text', text: 'There were 5 check-ins today.' }], 6, 2));

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
    expect(allowance.recordAssistant).toHaveBeenCalledWith(plan, 'gym-1', 'staff-1', {
      model: 'claude-haiku-4-5',
      inputTokens: 16,
      outputTokens: 4,
    });
  });

  it('omits a step for a tool call that errored, but keeps looping', async () => {
    llm.complete
      .mockResolvedValueOnce(step([{ type: 'tool_use', id: 't1', name: 'find_member', input: {} }], 5, 1))
      .mockResolvedValueOnce(step([{ type: 'text', text: 'I could not find that member.' }], 3, 1));
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
    expect(allowance.assertAssistantAvailable).not.toHaveBeenCalled();
    expect(llm.complete).not.toHaveBeenCalled();
  });

  it('rejects when the per-user rate limit is exceeded, before any DB or model call', async () => {
    rateLimiter.hit.mockResolvedValue(false);
    await expect(useCase.execute('gym-1', { message: 'hi' }, manager)).rejects.toMatchObject({
      code: 'RATE_LIMITED',
    });
    expect(allowance.assertAssistantAvailable).not.toHaveBeenCalled();
    expect(llm.complete).not.toHaveBeenCalled();
  });

  it('does not call the model when the allowance check fails', async () => {
    allowance.assertAssistantAvailable.mockRejectedValue(Object.assign(new Error('used up'), { code: 'AI_ALLOWANCE_EXCEEDED' }));
    await expect(useCase.execute('gym-1', { message: 'hi' }, manager)).rejects.toThrow('used up');
    expect(llm.complete).not.toHaveBeenCalled();
  });

  it('still records what was spent when a later step fails', async () => {
    llm.complete
      .mockResolvedValueOnce(step([{ type: 'tool_use', id: 't1', name: 'query_metric', input: {} }], 10, 2))
      .mockRejectedValueOnce(new Error('provider down'));
    await expect(useCase.execute('gym-1', { message: 'hi' }, manager)).rejects.toThrow('provider down');
    expect(allowance.recordAssistant).toHaveBeenCalledWith(plan, 'gym-1', 'staff-1', expect.objectContaining({ inputTokens: 10 }));
  });

  it('sends only the last six turns of history to the model', async () => {
    llm.complete.mockResolvedValueOnce(step([{ type: 'text', text: 'ok' }], 1, 1));
    const history = Array.from({ length: 10 }, (_, i) => ({ role: (i % 2 ? 'assistant' : 'user') as 'user' | 'assistant', content: `turn ${i}` }));
    await useCase.execute('gym-1', { message: 'latest', history }, manager);
    // The use case keeps appending to the same array, so check what came before the new message.
    const sent = llm.complete.mock.calls[0][0].messages;
    const latest = sent.findIndex((m) => m.content[0]?.type === 'text' && m.content[0].text === 'latest');
    expect(latest).toBe(6);
    expect(sent[0].content[0]).toEqual({ type: 'text', text: 'turn 4' });
  });

  it('rejects a gym-level caller targeting another gym', async () => {
    await expect(useCase.execute('gym-2', { message: 'hi' }, manager)).rejects.toMatchObject({
      code: 'GYM_ACCESS_DENIED',
    });
  });

  it('still answers when recording the usage fails, and logs it', async () => {
    const logError = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    llm.complete.mockResolvedValueOnce(step([{ type: 'text', text: 'ok' }], 1, 1));
    allowance.recordAssistant.mockRejectedValueOnce(new Error('db blip'));
    await expect(useCase.execute('gym-1', { message: 'hi' }, manager)).resolves.toMatchObject({ answer: 'ok' });
    expect(logError).toHaveBeenCalledWith(expect.stringContaining('assistant usage not recorded gym=gym-1'), expect.any(String));
  });

  it('starts the trimmed history on a user turn', async () => {
    llm.complete.mockResolvedValueOnce(step([{ type: 'text', text: 'ok' }], 1, 1));
    // 7 turns starting with the user: the last six start with an assistant turn, which is dropped.
    const history = Array.from({ length: 7 }, (_, i) => ({ role: (i % 2 ? 'assistant' : 'user') as 'user' | 'assistant', content: `turn ${i}` }));
    await useCase.execute('gym-1', { message: 'latest', history }, manager);
    const sent = llm.complete.mock.calls[0][0].messages;
    expect(sent[0]).toMatchObject({ role: 'user', content: [{ type: 'text', text: 'turn 2' }] });
  });
});
