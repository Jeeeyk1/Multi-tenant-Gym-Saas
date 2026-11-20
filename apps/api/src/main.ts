import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { RedisIoAdapter } from './common/adapters/redis-io.adapter';
import { RequestContextLogger } from './common/logger/request-context.logger';
import { requestIdMiddleware } from './common/middleware/request-id.middleware';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  // Custom logger: prefixes every line with the request id (from AsyncLocalStorage).
  app.useLogger(new RequestContextLogger());
  const logger = new Logger('Bootstrap');

  // First middleware: assign a correlation id and open the AsyncLocalStorage scope
  // so every downstream handler, log line, and error carries it.
  app.use(requestIdMiddleware);

  const config = app.get(ConfigService);
  const port = config.get<number>('app.port') ?? 9001;
  const prefix = config.get<string>('app.apiPrefix') ?? 'api';

  // WebSocket adapter backed by Redis — enables real-time chat across
  // multiple API instances. Must be set before app.listen().
  const redisAdapter = new RedisIoAdapter(app, config);
  await redisAdapter.connectToRedis();
  app.useWebSocketAdapter(redisAdapter);

  // Security headers (HSTS, X-Content-Type-Options, etc.). Safe defaults for a JSON API.
  app.use(helmet());

  // gzip responses — trades a little CPU for much less bandwidth + faster mobile parse.
  app.use(compression());

  // Behind Caddy/Cloudflare in production — trust the first proxy so `req.ip`
  // (used by the auth throttle) is the real client IP, not the proxy's.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  app.setGlobalPrefix(prefix);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  app.enableCors({ origin: config.get<string[]>('app.corsOrigins') ?? [], credentials: true });

  // Drain in-flight requests and disconnect Prisma/Redis cleanly on SIGTERM/SIGINT
  // (deploys, restarts) instead of dropping connections.
  app.enableShutdownHooks();

  await app.listen(port, '0.0.0.0');
  logger.log(`API listening on http://0.0.0.0:${port}/${prefix}`);
  logger.log(`Health: http://localhost:${port}/${prefix}/health`);
  logger.log(`WebSocket chat: ws://localhost:${port}/chat`);
}

bootstrap();
