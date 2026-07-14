import { DomainError } from './domain.error';

/**
 * HTTP 402 — the gym's subscription isn't active, so gym operations are locked
 * until the outstanding invoice is paid and verified. Clients catch this and
 * route the owner to the payment screen.
 */
export class PaymentRequiredError extends DomainError {
  readonly statusCode = 402;

  constructor(message: string, code = 'SUBSCRIPTION_INACTIVE') {
    super(message, code);
  }
}
