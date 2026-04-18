import { UnauthorizedError } from '../../../../common/errors';

/**
 * Thrown when login credentials are invalid.
 *
 * Intentionally generic — do not reveal whether the email exists,
 * the account is inactive, or the password is wrong.
 */
export class InvalidCredentialsError extends UnauthorizedError {
  constructor() {
    super('Invalid credentials', 'INVALID_CREDENTIALS');
  }
}
