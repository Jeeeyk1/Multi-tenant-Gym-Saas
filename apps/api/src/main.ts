import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { RedisIoAdapter } from './common/adapters/redis-io.adapter';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);
  const port = config.get<number>('app.port') ?? 3001;
  const prefix = config.get<string>('app.apiPrefix') ?? 'api';

  // WebSocket adapter backed by Redis — enables real-time chat across
  // multiple API instances. Must be set before app.listen().
  const redisAdapter = new RedisIoAdapter(app, config);
  await redisAdapter.connectToRedis();
  app.useWebSocketAdapter(redisAdapter);

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

  app.enableCors();

  await app.listen(port, '0.0.0.0');
  logger.log(`API listening on http://0.0.0.0:${port}/${prefix}`);
  logger.log(`Health: http://localhost:${port}/${prefix}/health`);
  logger.log(`WebSocket chat: ws://localhost:${port}/chat`);
}

bootstrap();
