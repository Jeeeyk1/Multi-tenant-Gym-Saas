export interface AiResponse {
  text: string;
  tokensUsed: number;
}

export interface AiProviderPort {
  chat(prompt: string, maxTokens: number): Promise<AiResponse>;
}

export const AI_PROVIDER_PORT = Symbol('AI_PROVIDER_PORT');
