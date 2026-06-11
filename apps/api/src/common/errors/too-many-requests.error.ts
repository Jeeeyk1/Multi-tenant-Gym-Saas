import { DomainError } from './domain.error';

export class TooManyRequestsError extends DomainError {
  readonly statusCode = 429;

  constructor(message: string, code = 'TOO_MANY_REQUESTS') {
    super(message, code);
  }
}
