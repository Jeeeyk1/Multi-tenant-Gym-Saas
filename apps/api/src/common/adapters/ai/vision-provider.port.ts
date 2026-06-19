import type { AiResponse } from './ai-provider.port';

export interface VisionProviderPort {
  analyseImage(imageUrl: string, prompt: string, maxTokens: number): Promise<AiResponse>;
}

export const VISION_PROVIDER_PORT = Symbol('VISION_PROVIDER_PORT');
