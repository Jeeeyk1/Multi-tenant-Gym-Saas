import { AsyncLocalStorage } from 'node:async_hooks';

interface Store {
  requestId: string;
}

const storage = new AsyncLocalStorage<Store>();

/**
 * Per-request context propagated via AsyncLocalStorage. Set once by the request-id
 * middleware; readable anywhere downstream (services, use cases, the logger, the
 * exception filter) without threading it through call signatures.
 */
export const requestContext = {
  /** Runs `fn` (and everything it awaits) with the given request id in scope. */
  run<T>(requestId: string, fn: () => T): T {
    return storage.run({ requestId }, fn);
  },

  /** The current request's id, or undefined outside a request (crons, bootstrap). */
  getRequestId(): string | undefined {
    return storage.getStore()?.requestId;
  },
};
