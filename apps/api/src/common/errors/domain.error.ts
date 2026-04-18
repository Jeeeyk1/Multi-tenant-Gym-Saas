/**
 * Base class for all domain and application errors.
 *
 * Use typed subclasses (NotFoundError, ForbiddenError, etc.) in use cases.
 * The GlobalExceptionFilter maps these to HTTP responses.
 *
 * Never throw plain Error objects from use cases — always use a typed subclass
 * so the filter can produce the correct HTTP status code.
 */
export abstract class DomainError extends Error {
  /**
   * Machine-readable error code.
   * Convention: SCREAMING_SNAKE_CASE, e.g. 'MEMBER_NOT_FOUND'
   */
  abstract readonly statusCode: number;

  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = this.constructor.name;
    // Maintain proper prototype chain in compiled JS
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
