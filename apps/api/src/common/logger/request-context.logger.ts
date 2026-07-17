import { ConsoleLogger } from '@nestjs/common';
import { requestContext } from '../context/request-context';

/**
 * Drop-in replacement for the default Nest logger that prefixes every log line
 * with the current request id (`[req:<id>]`), pulled from AsyncLocalStorage.
 *
 * This means existing `new Logger(...)` calls across the codebase automatically
 * become correlatable — a single grep of the id returned to the client surfaces
 * every line from that request. Logs emitted outside a request (crons, bootstrap)
 * simply have no prefix.
 */
export class RequestContextLogger extends ConsoleLogger {
  log(message: unknown, ...rest: unknown[]): void {
    super.log(this.tag(message), ...rest);
  }

  warn(message: unknown, ...rest: unknown[]): void {
    super.warn(this.tag(message), ...rest);
  }

  error(message: unknown, ...rest: unknown[]): void {
    super.error(this.tag(message), ...rest);
  }

  debug(message: unknown, ...rest: unknown[]): void {
    super.debug(this.tag(message), ...rest);
  }

  verbose(message: unknown, ...rest: unknown[]): void {
    super.verbose(this.tag(message), ...rest);
  }

  private tag(message: unknown): unknown {
    const id = requestContext.getRequestId();
    return id && typeof message === 'string' ? `[req:${id}] ${message}` : message;
  }
}
