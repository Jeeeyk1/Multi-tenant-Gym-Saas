import { Inject, Injectable, Logger } from '@nestjs/common';
import { DomainError, TooManyRequestsError } from '../../../../common/errors';
import { LLM_PORT, type LlmPort } from '../ports/llm.port';
import { ToolRegistry, type ToolCall, type ToolContext } from '../tools/tool-registry';
import { ActionTools, isAssistantAction } from '../tools/action-tools';
import { ToolInputError } from '../tools/tool-input';
import { PendingActionStore } from '../../infrastructure/persistence/pending-action.store';
import { toPendingActionView, type PendingAction, type PendingActionView } from '../../domain/pending-action';
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
const PROPOSED_ACTION_ANSWER = "Here's what I'll do. Nothing changes until you confirm.";

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
  /** An action the assistant proposed. It runs only when the user confirms it (POST .../actions/:id/confirm). */
  pendingAction: PendingActionView | null;
}

type ToolUse = Extract<LlmContent, { type: 'tool_use' }>;

@Injectable()
export class AnswerQueryUseCase {
  private readonly logger = new Logger(AnswerQueryUseCase.name);

  constructor(
    @Inject(LLM_PORT) private readonly llm: LlmPort,
    private readonly tools: ToolRegistry,
    private readonly actions: ActionTools,
    private readonly pendingActions: PendingActionStore,
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
    const schemas = [...this.tools.schemas(), ...this.actions.schemas()];
    const ctx: ToolContext = { gymId, caller };
    const toolsUsed: string[] = [];
    const steps: InsightsStep[] = [];
    const usage = { model: '', inputTokens: 0, outputTokens: 0 };
    let answer = 'I could not find an answer to that.';
    let pending: PendingAction | null = null;

    try {
      for (let step = 0; step < MAX_STEPS; step++) {
        const result = await this.llm.complete({ system, tools: schemas, messages });
        usage.model = result.model;
        usage.inputTokens += result.inputTokens;
        usage.outputTokens += result.outputTokens;
        messages.push(result.message);

        const calls = result.message.content.filter((block): block is ToolUse => block.type === 'tool_use');

        if (calls.length === 0) {
          answer = textOf(result.message) || answer;
          break;
        }

        toolsUsed.push(...calls.map((call) => call.name));
        const round = await this.runCalls(calls, ctx);
        steps.push(...round.steps);

        // A proposed action ends the turn: the user confirms it in the app, not the model.
        if (round.pending) {
          // A fixed line, not the model's text: it can't claim the action already happened.
          pending = round.pending;
          answer = PROPOSED_ACTION_ANSWER;
          break;
        }
        messages.push({ role: 'user', content: round.results });
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
    return { answer, toolsUsed, steps, pendingAction: pending && toPendingActionView(pending) };
  }

  /** Runs read tools; turns the first action into a pending action (one per answer). */
  private async runCalls(calls: ToolUse[], ctx: ToolContext) {
    const steps: InsightsStep[] = [];
    let pending: PendingAction | null = null;
    // Picked up front: calls run in parallel, so "first" can't depend on which finishes first.
    const firstAction = calls.find((call) => isAssistantAction(call.name));

    const results = await Promise.all(
      calls.map(async (call): Promise<LlmContent> => {
        if (!isAssistantAction(call.name)) {
          const execution = await this.tools.execute(call, ctx);
          if (!execution.isError) steps.push({ tool: call.name, label: this.tools.stepLabel(call.name), data: execution.data });
          return execution.content;
        }
        if (call !== firstAction) return toolError(call, 'Only one action can be proposed at a time.');
        let proposed: PendingAction;
        try {
          proposed = await this.actions.propose({ ...call, name: call.name }, ctx);
        } catch (err) {
          // Input and permission problems go back to the model so it can ask the user. Anything else
          // (e.g. the database) is logged and kept out of the conversation.
          if (err instanceof ToolInputError || err instanceof DomainError) return toolError(call, err.message);
          this.logger.error(
            `action proposal failed gym=${ctx.gymId} user=${ctx.caller.sub} action=${call.name}`,
            err instanceof Error ? err.stack : String(err),
          );
          return toolError(call, 'Something went wrong preparing that action. Ask the user to try again.');
        }
        try {
          await this.pendingActions.save(proposed);
        } catch (err) {
          this.logger.error(`pending action not saved gym=${ctx.gymId} user=${ctx.caller.sub} action=${call.name}`, err instanceof Error ? err.stack : String(err));
          return toolError(call, 'Actions are unavailable right now. Ask the user to try again in a moment.');
        }
        pending = proposed;
        this.logger.log(`action proposed id=${proposed.id} gym=${ctx.gymId} user=${ctx.caller.sub} action=${proposed.action}`);
        return { type: 'tool_result', toolUseId: call.id, content: 'Waiting for the user to confirm in the app.' };
      }),
    );
    return { results, steps, pending: pending as PendingAction | null };
  }
}

function toolError(call: ToolCall, message: string): LlmContent {
  return { type: 'tool_result', toolUseId: call.id, content: message, isError: true };
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
