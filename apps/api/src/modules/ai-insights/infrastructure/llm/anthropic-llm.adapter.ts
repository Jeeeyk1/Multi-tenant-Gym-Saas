import Anthropic from '@anthropic-ai/sdk';
import type { LlmPort } from '../../application/ports/llm.port';
import type { LlmContent, LlmMessage, LlmRequest, LlmResult } from '../../domain/llm.types';

const MAX_TOKENS = 1024;

export class AnthropicLlmAdapter implements LlmPort {
  constructor(
    private readonly client: Anthropic,
    private readonly model: string,
  ) {}

  async complete(request: LlmRequest): Promise<LlmResult> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: MAX_TOKENS,
      system: request.system,
      tools: request.tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.inputSchema as Anthropic.Tool.InputSchema,
      })),
      messages: request.messages.map(toAnthropicMessage),
    });

    return {
      message: { role: 'assistant', content: response.content.map(fromAnthropicBlock) },
      stopReason: response.stop_reason ?? 'end_turn',
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
    };
  }
}

function toAnthropicMessage(message: LlmMessage): Anthropic.MessageParam {
  return {
    role: message.role,
    content: message.content.map((block): Anthropic.ContentBlockParam => {
      switch (block.type) {
        case 'text':
          return { type: 'text', text: block.text };
        case 'tool_use':
          return { type: 'tool_use', id: block.id, name: block.name, input: block.input };
        case 'tool_result':
          return {
            type: 'tool_result',
            tool_use_id: block.toolUseId,
            content: block.content,
            is_error: block.isError,
          };
      }
    }),
  };
}

function fromAnthropicBlock(block: Anthropic.ContentBlock): LlmContent {
  if (block.type === 'tool_use') {
    return {
      type: 'tool_use',
      id: block.id,
      name: block.name,
      input: (block.input ?? {}) as Record<string, unknown>,
    };
  }
  return { type: 'text', text: block.type === 'text' ? block.text : '' };
}
