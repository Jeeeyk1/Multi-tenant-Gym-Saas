import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { DomainError } from '../errors/domain.error';

/**
 * Catches all exceptions and maps them to a consistent JSON response shape.
 *
 * Priority:
 * 1. DomainError subclasses (NotFoundError, ForbiddenError, etc.)
 *    → mapped to their declared statusCode + code field
 * 2. NestJS HttpExceptions (thrown by guards, pipes, or controllers)
 *    → mapped to their HTTP status
 * 3. Everything else
 *    → 500 Internal Server Error (detail hidden from client)
 *
 * Response shape:
 * {
 *   statusCode: number,
 *   code:       string | null,   // machine-readable, from DomainError
 *   message:    string,
 *   path:       string,
 *   timestamp:  string
 * }
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode: number;
    let code: string | null = null;
    let message: string;

    if (exception instanceof DomainError) {
      statusCode = exception.statusCode;
      code = exception.code;
      message = exception.message;
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();
      message =
        typeof res === 'string'
          ? res
          : (res as Record<string, unknown>).message?.toString() ??
            exception.message;
    } else {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
    }

    if (statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.url} → ${statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(statusCode).json({
      statusCode,
      code,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
