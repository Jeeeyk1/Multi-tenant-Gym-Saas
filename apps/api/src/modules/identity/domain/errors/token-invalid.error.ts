import { UnauthorizedError } from '../../../../common/errors';

/**
 * Thrown when a refresh token or invite token is invalid, expired, or already used.
 */
export class TokenInvalidError extends UnauthorizedError {
  constructor() {
    super('Token is invalid or has expired', 'TOKEN_INVALID');
  }
}
