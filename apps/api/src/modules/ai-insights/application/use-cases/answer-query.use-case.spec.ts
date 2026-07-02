import { AnswerQueryUseCase } from './answer-query.use-case';
import type { LlmPort } from '../ports/llm.port';
import type { ToolRegistry } from '../tools/tool-registry';
import type { EntitlementsService } from '../entitlements.service';
import type { InsightsRepository, Entitlement } from '../../infrastructure/persistence/insights.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

const llm = { complete: jest.fn() } as unknown as jest.Mocked<LlmPort>;
const tools = {
  systemPrompt: jest.fn(() => 'system'),
  schemas: jest.fn(() => []),
  execute: jest.fn(),
} as unknown as jest.Mocked<ToolRegistry>;
const entitlements = { check: jest.fn() } as unknown as jest.Mocked<EntitlementsService>;
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
    useCase = new AnswerQueryUseCase(llm, tools, entitlements, repo);
    entitlements.check.mockResolvedValue(entitlement);
    tools.execute.mockResolvedValue({ type: 'tool_result', toolUseId: 't1', content: '{"value":5}' });
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

    expect(tools.execute).toHaveBeenCalledWith(expect.objectContaining({ id: 't1' }), 'gym-1');
    expect(result).toEqual({ answer: 'There were 5 check-ins today.', toolsUsed: ['query_metric'] });
    expect(repo.recordUsage).toHaveBeenCalledWith(entitlement, 'gym-1', 'staff-1', 18);
  });

  it('blocks callers without insights.query before touching the model', async () => {
    const frontDesk: AuthenticatedUser = { ...manager, permissions: ['checkins.manage'] };
    await expect(useCase.execute('gym-1', { message: 'hi' }, frontDesk)).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
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
