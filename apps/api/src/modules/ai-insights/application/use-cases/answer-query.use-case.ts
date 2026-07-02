import { Inject, Injectable } from '@nestjs/common';
import { ForbiddenError } from '../../../../common/errors';
import { LLM_PORT, type LlmPort } from '../ports/llm.port';
import { ToolRegistry } from '../tools/tool-registry';
import { EntitlementsService } from '../entitlements.service';
import { InsightsRepository } from '../../infrastructure/persistence/insights.repository';
import type { LlmContent, LlmMessage } from '../../domain/llm.types';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

const MAX_STEPS = 5;

export interface InsightsQueryInput {
  message: string;
  history?: { role: 'user' | 'assistant'; content: string }[];
}

export interface InsightsQueryResult {
  answer: string;
  toolsUsed: string[];
}

@Injectable()
export class AnswerQueryUseCase {
  constructor(
    @Inject(LLM_PORT) private readonly llm: LlmPort,
    private readonly tools: ToolRegistry,
    private readonly entitlements: EntitlementsService,
    private readonly repo: InsightsRepository,
  ) {}

  async execute(
    gymId: string,
    input: InsightsQueryInput,
    caller: AuthenticatedUser,
  ): Promise<InsightsQueryResult> {
    assertGymAccess(caller, gymId);
    assertPermission(caller, 'insights.query');

    const entitlement = await this.entitlements.check(gymId);

    const messages: LlmMessage[] = [
      ...(input.history ?? []).map((turn) => ({
        role: turn.role,
        content: [{ type: 'text', text: turn.content }] as LlmContent[],
      })),
      { role: 'user', content: [{ type: 'text', text: input.message }] },
    ];

    const system = this.tools.systemPrompt();
    const schemas = this.tools.schemas();
    const toolsUsed: string[] = [];
    let tokensUsed = 0;
    let answer = 'I could not find an answer to that.';

    for (let step = 0; step < MAX_STEPS; step++) {
      const result = await this.llm.complete({ system, tools: schemas, messages });
      tokensUsed += result.tokensUsed;
      messages.push(result.message);

      const calls = result.message.content.filter(
        (block): block is Extract<LlmContent, { type: 'tool_use' }> => block.type === 'tool_use',
      );

      if (calls.length === 0) {
        answer = textOf(result.message) || answer;
        break;
      }

      toolsUsed.push(...calls.map((call) => call.name));
      const results = await Promise.all(calls.map((call) => this.tools.execute(call, gymId)));
      messages.push({ role: 'user', content: results });
    }

    await this.repo.recordUsage(entitlement, gymId, caller.sub, tokensUsed);
    return { answer, toolsUsed };
  }
}

function textOf(message: LlmMessage): string {
  return message.content
    .filter((block): block is Extract<LlmContent, { type: 'text' }> => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim();
}

function assertGymAccess(caller: AuthenticatedUser, gymId: string) {
  if (caller.type === 'gym' && caller.gymId !== gymId) {
    throw new ForbiddenError('Access denied to this gym', 'GYM_ACCESS_DENIED');
  }
}

function assertPermission(caller: AuthenticatedUser, permission: string) {
  if (caller.type === 'gym' && !caller.permissions.includes(permission)) {
    throw new ForbiddenError(`Missing permission: ${permission}`, 'PERMISSION_DENIED');
  }
}
