import type { LlmRequest, LlmResult } from '../../domain/llm.types';

export const LLM_PORT = Symbol('LLM_PORT');

export interface LlmPort {
  complete(request: LlmRequest): Promise<LlmResult>;
}
