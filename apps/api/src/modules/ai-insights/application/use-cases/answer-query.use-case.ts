import { Inject, Injectable, Logger } from '@nestjs/common';
import { TooManyRequestsError } from '../../../../common/errors';
import { LLM_PORT, type LlmPort } from '../ports/llm.port';
import { ToolRegistry } from '../tools/tool-registry';
import { AiAllowanceService } from '../../../ai-usage/application/ai-allowance.service';
import { RateLimiterService } from '../../../../common/rate-limiter/rate-limiter.service';
import type { LlmContent, LlmMessage } from '../../domain/llm.types';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { assertGymAccess, assertPermission } from '../../../../common/auth/authorization';
import { Permission } from '../../../../common/enums';

// Ceilings per question, to keep each answer's cost predictable.
const MAX_STEPS = 4;
const HISTORY_TURNS = 6;
const RATE_LIMIT = 15;
const RATE_WINDOW_SECONDS = 60;

export interface InsightsQueryInput {
  message: string;
  history?: { role: 'user' | 'assistant'; content: string }[];
}

export interface InsightsStep {
  tool: string;
  label: string;
  data: unknown;
}

export interface InsightsQueryResult {
  answer: string;
  toolsUsed: string[];
  steps: InsightsStep[];
}

@Injectable()
export class AnswerQueryUseCase {
  private readonly logger = new Logger(AnswerQueryUseCase.name);

  constructor(
    @Inject(LLM_PORT) private readonly llm: LlmPort,
    private readonly tools: ToolRegistry,
    private readonly allowance: AiAllowanceService,
    private readonly rateLimiter: RateLimiterService,
  ) {}

  async execute(
    gymId: string,
    input: InsightsQueryInput,
    caller: AuthenticatedUser,
  ): Promise<InsightsQueryResult> {
    assertGymAccess(caller, gymId);
    assertPermission(caller, Permission.INSIGHTS_QUERY);

    const allowed = await this.rateLimiter.hit(`insights:rate:${caller.sub}`, RATE_LIMIT, RATE_WINDOW_SECONDS);
    if (!allowed) {
      throw new TooManyRequestsError('Too many requests. Please wait a moment and try again.', 'RATE_LIMITED');
    }

    const plan = await this.allowance.assertAssistantAvailable(gymId, caller);

    // Only the last few turns go to the model: older ones add cost without helping the answer.
    const messages: LlmMessage[] = [
      ...recentTurns(input.history ?? []).map((turn) => ({
        role: turn.role,
        content: [{ type: 'text', text: turn.content }] as LlmContent[],
      })),
      { role: 'user', content: [{ type: 'text', text: input.message }] },
    ];

    const system = this.tools.systemPrompt();
    const schemas = this.tools.schemas();
    const toolsUsed: string[] = [];
    const steps: InsightsStep[] = [];
    const usage = { model: '', inputTokens: 0, outputTokens: 0 };
    let answer = 'I could not find an answer to that.';

    try {
      for (let step = 0; step < MAX_STEPS; step++) {
        const result = await this.llm.complete({ system, tools: schemas, messages });
        usage.model = result.model;
        usage.inputTokens += result.inputTokens;
        usage.outputTokens += result.outputTokens;
        messages.push(result.message);

        const calls = result.message.content.filter(
          (block): block is Extract<LlmContent, { type: 'tool_use' }> => block.type === 'tool_use',
        );

        if (calls.length === 0) {
          answer = textOf(result.message) || answer;
          break;
        }

        toolsUsed.push(...calls.map((call) => call.name));
        const executions = await Promise.all(calls.map((call) => this.tools.execute(call, { gymId, caller })));
        messages.push({ role: 'user', content: executions.map((execution) => execution.content) });

        calls.forEach((call, i) => {
          const execution = executions[i];
          if (!execution.isError) {
            steps.push({ tool: call.name, label: this.tools.stepLabel(call.name), data: execution.data });
          }
        });
      }
    } finally {
      // Recorded even when a step fails: the model calls that did run still cost us. A failure to
      // record mustn't turn a paid answer into an error (the user would retry and pay again).
      if (usage.model) {
        await this.allowance.recordAssistant(plan, gymId, caller.sub, usage).catch((err: unknown) =>
          this.logger.error(
            `assistant usage not recorded gym=${gymId} user=${caller.sub} model=${usage.model} in=${usage.inputTokens} out=${usage.outputTokens}`,
            err instanceof Error ? err.stack : String(err),
          ),
        );
      }
    }
    return { answer, toolsUsed, steps };
  }
}

/** The last few turns, starting on a user turn (the model expects a conversation to open with one). */
function recentTurns<T extends { role: 'user' | 'assistant' }>(history: T[]): T[] {
  const recent = history.slice(-HISTORY_TURNS);
  const firstUser = recent.findIndex((turn) => turn.role === 'user');
  return firstUser === -1 ? [] : recent.slice(firstUser);
}

function textOf(message: LlmMessage): string {
  return message.content
    .filter((block): block is Extract<LlmContent, { type: 'text' }> => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim();
}
