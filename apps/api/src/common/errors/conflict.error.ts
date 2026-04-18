import { DomainError } from './domain.error';

/**
 * HTTP 409 — Request conflicts with existing state.
 *
 * @example
 * throw new ConflictError('Member is already checked in', 'MEMBER_ALREADY_CHECKED_IN');
 */
export class ConflictError extends DomainError {
  readonly statusCode = 409;

  constructor(message: string, code: string) {
    super(message, code);
  }
}
