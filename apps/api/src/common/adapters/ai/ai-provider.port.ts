export interface AiResponse {
  text: string;
  /** inputTokens + outputTokens. */
  tokensUsed: number;
  inputTokens: number;
  outputTokens: number;
  /** The model that answered, for pricing (see ai-pricing.ts). */
  model: string;
}

export interface AiProviderPort {
  chat(prompt: string, maxTokens: number): Promise<AiResponse>;
}

export const AI_PROVIDER_PORT = Symbol('AI_PROVIDER_PORT');
