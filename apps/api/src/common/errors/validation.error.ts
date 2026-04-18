import { DomainError } from './domain.error';

/**
 * HTTP 422 — Request is well-formed but contains invalid business-level data.
 *
 * Distinct from DTO validation (400 Bad Request) which is handled by the
 * ValidationPipe. Use this for domain-level validation failures.
 *
 * @example
 * throw new ValidationError('Expiry date cannot be in the past', 'INVALID_EXPIRY_DATE');
 */
export class ValidationError extends DomainError {
  readonly statusCode = 422;

  constructor(message: string, code: string) {
    super(message, code);
  }
}
