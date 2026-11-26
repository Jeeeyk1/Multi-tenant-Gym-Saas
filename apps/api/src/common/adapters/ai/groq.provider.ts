import OpenAI from 'openai';
import type { AiProviderPort, AiResponse } from './ai-provider.port';

export type ReasoningEffort = 'low' | 'medium' | 'high';

export class GroqProvider implements AiProviderPort {
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly reasoningEffort: ReasoningEffort;

  constructor(apiKey: string, baseURL: string, model = 'openai/gpt-oss-120b', reasoningEffort: ReasoningEffort = 'low') {
    this.client = new OpenAI({ apiKey, baseURL });
    this.model = model;
    this.reasoningEffort = reasoningEffort;
  }

  /**
   * gpt-oss models reason before answering, and those tokens count against max_tokens.
   * At the default effort a meal plan used 1,498 of 1,500 tokens reasoning and came back
   * empty; low effort answers in about a third of the tokens.
   */
  private reasoningOptions(): { reasoning_effort?: ReasoningEffort } {
    return this.model.includes('gpt-oss') ? { reasoning_effort: this.reasoningEffort } : {};
  }

  async chat(prompt: string, maxTokens: number): Promise<AiResponse> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
      ...this.reasoningOptions(),
    });

    return {
      text: response.choices[0]?.message?.content ?? '',
      tokensUsed: response.usage?.total_tokens ?? 0,
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
      model: this.model,
    };
  }
}
