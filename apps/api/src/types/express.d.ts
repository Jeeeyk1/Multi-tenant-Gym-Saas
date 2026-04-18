import type { AuthenticatedUser } from '../common/types/auth.types';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
