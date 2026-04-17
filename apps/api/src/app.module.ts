import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { appConfig } from './config/app.config';
import { databaseConfig } from './config/database.config';
import { redisConfig } from './config/redis.config';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        PORT: Joi.number().default(3001),
        DATABASE_URL: Joi.string().required(),
        REDIS_URL: Joi.string().required(),
      }),
    }),
    HealthModule,
  ],
})
export class AppModule {}
