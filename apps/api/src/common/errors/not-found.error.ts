import { DomainError } from './domain.error';

/**
 * HTTP 404 — Resource does not exist or is not visible to the caller.
 *
 * @example
 * throw new NotFoundError('Member not found', 'MEMBER_NOT_FOUND');
 */
export class NotFoundError extends DomainError {
  readonly statusCode = 404;

  constructor(message: string, code = 'NOT_FOUND') {
    super(message, code);
  }
}
