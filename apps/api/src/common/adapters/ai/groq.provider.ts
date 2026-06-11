import OpenAI from 'openai';
import type { AiProviderPort, AiResponse } from './ai-provider.port';

export class GroqProvider implements AiProviderPort {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(apiKey: string, baseURL: string, model = 'llama-3.3-70b-versatile') {
    this.client = new OpenAI({ apiKey, baseURL });
    this.model = model;
  }

  async chat(prompt: string, maxTokens: number): Promise<AiResponse> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    });

    return {
      text: response.choices[0]?.message?.content ?? '',
      tokensUsed: response.usage?.total_tokens ?? 0,
    };
  }
}
