import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

// In production, per-request logging is I/O overhead and noise. Log every request in
// dev, but only slow ones in production. Health probes are never logged.
const IS_PROD = process.env.NODE_ENV === 'production';
const SLOW_MS = 500;

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url } = request;
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        if (url.includes('/health')) return;
        const ms = Date.now() - start;
        if (IS_PROD && ms < SLOW_MS) return;
        const line = `${method} ${url} — ${ms}ms`;
        if (ms >= SLOW_MS) this.logger.warn(`SLOW ${line}`);
        else this.logger.log(line);
      }),
    );
  }
}
