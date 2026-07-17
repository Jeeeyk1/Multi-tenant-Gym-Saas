import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { requestContext } from '../context/request-context';

const HEADER = 'x-request-id';

/**
 * Assigns every request a correlation id and runs the rest of the request inside
 * an AsyncLocalStorage scope carrying it. Accepts an inbound `X-Request-Id`
 * (e.g. set by Caddy/Cloudflare) so a trace can span the proxy; otherwise mints one.
 * The id is returned on the response header and (by the exception filter) in error
 * bodies, so a user can quote it and support can grep a single value.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const inbound = req.headers[HEADER];
  const requestId = (typeof inbound === 'string' && inbound.trim().length > 0
    ? inbound.trim()
    : randomUUID()
  ).slice(0, 200);

  res.setHeader('X-Request-Id', requestId);
  requestContext.run(requestId, () => next());
}
