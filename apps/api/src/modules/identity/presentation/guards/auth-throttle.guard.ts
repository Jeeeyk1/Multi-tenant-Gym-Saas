import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { RateLimiterService } from '../../../../common/rate-limiter/rate-limiter.service';

const LIMIT = 10; // attempts
const WINDOW_SECONDS = 60;

/**
 * Per-IP fixed-window throttle for brute-force-sensitive auth routes (login,
 * password reset). Backed by the shared Redis `RateLimiterService`, so the limit
 * is enforced across all PM2 workers — an in-memory throttler would count per
 * worker and let 2× through. Each route path gets its own bucket.
 */
@Injectable()
export class AuthThrottleGuard implements CanActivate {
  constructor(private readonly rateLimiter: RateLimiterService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const key = `throttle:auth:${req.path}:${clientIp(req)}`;
    const withinLimit = await this.rateLimiter.hit(key, LIMIT, WINDOW_SECONDS);
    if (!withinLimit) {
      throw new HttpException(
        'Too many attempts. Please wait a minute and try again.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }
}

/** Real client IP — first hop of X-Forwarded-For (set by Caddy), else the socket address. */
function clientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip ?? req.socket?.remoteAddress ?? 'unknown';
}
