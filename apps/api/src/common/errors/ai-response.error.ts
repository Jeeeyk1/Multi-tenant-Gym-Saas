import { DomainError } from './domain.error';

/**
 * HTTP 502 — the AI provider answered, but not with something usable (empty, cut off,
 * or not the JSON we asked for). Safe for the client to retry.
 */
export class AiResponseError extends DomainError {
  readonly statusCode = 502;

  constructor(message = "The AI couldn't put an answer together. Please try again.", code = 'AI_BAD_RESPONSE') {
    super(message, code);
  }
}
