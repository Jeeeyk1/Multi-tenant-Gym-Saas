export type LlmContent =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; toolUseId: string; content: string; isError?: boolean };

export interface LlmMessage {
  role: 'user' | 'assistant';
  content: LlmContent[];
}

export interface LlmToolSchema {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface LlmRequest {
  system: string;
  tools: LlmToolSchema[];
  messages: LlmMessage[];
}

export interface LlmResult {
  message: LlmMessage;
  stopReason: string;
  tokensUsed: number;
}
