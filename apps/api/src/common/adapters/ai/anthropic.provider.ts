import Anthropic from '@anthropic-ai/sdk';
import type { AiProviderPort, AiResponse } from './ai-provider.port';

export class AnthropicProvider implements AiProviderPort {
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(apiKey: string, model = 'claude-sonnet-4-6', baseURL?: string) {
    this.client = new Anthropic({ apiKey, ...(baseURL ? { baseURL } : {}) });
    this.model = model;
  }

  async chat(prompt: string, maxTokens: number): Promise<AiResponse> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('');

    return {
      text,
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
    };
  }
}
