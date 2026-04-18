import { DomainError } from './domain.error';

/**
 * HTTP 401 — Caller is not authenticated or credentials are invalid.
 *
 * @example
 * throw new UnauthorizedError('Invalid credentials', 'INVALID_CREDENTIALS');
 */
export class UnauthorizedError extends DomainError {
  readonly statusCode = 401;

  constructor(message: string, code = 'UNAUTHORIZED') {
    super(message, code);
  }
}
