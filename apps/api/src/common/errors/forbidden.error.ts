import { DomainError } from './domain.error';

/**
 * HTTP 403 — Caller is authenticated but not permitted to perform this action.
 *
 * @example
 * throw new ForbiddenError('Gym limit reached for current plan', 'GYM_LIMIT_REACHED');
 */
export class ForbiddenError extends DomainError {
  readonly statusCode = 403;

  constructor(message: string, code = 'FORBIDDEN') {
    super(message, code);
  }
}
