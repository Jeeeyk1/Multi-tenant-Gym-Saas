import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import * as Joi from 'joi';
import { appConfig } from './config/app.config';
import { databaseConfig } from './config/database.config';
import { jwtConfig } from './config/jwt.config';
import { redisConfig } from './config/redis.config';
import { PrismaModule } from './common/prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { HealthModule } from './modules/health/health.module';
import { IdentityModule } from './modules/identity/identity.module';
import { OrganizationModule } from './modules/organization/organization.module';
import { GymModule } from './modules/gym/gym.module';
import { StaffModule } from './modules/staff/staff.module';
import { MembershipPlansModule } from './modules/membership-plans/membership-plans.module';
import { MembersModule } from './modules/members/members.module';
import { CheckInsModule } from './modules/check-ins/check-ins.module';
import { RenewalsModule } from './modules/renewals/renewals.module';
import { AnnouncementsModule } from './modules/announcements/announcements.module';
import { ChatModule } from './modules/chat/chat.module';
import { CronModule } from './cron/cron.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AiModule } from './modules/ai/ai.module';
import { LeaderboardModule } from './modules/leaderboard/leaderboard.module';
import { AdminModule } from './modules/admin/admin.module';
import { PublicModule } from './modules/public/public.module';
import { EmailModule } from './common/email/email.module';
import { WorkoutsModule } from './modules/workouts/workouts.module';
import { BadgesModule } from './modules/badges/badges.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AiInsightsModule } from './modules/ai-insights/ai-insights.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // CWD when the API starts is apps/api/, so ../../.env is the workspace root .env.
      // All config lives there — apps/api/.env is only for local overrides.
      envFilePath: ['../../.env', '.env'],
      load: [appConfig, databaseConfig, redisConfig, jwtConfig],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        PORT: Joi.number().default(3001),
        DATABASE_URL: Joi.string().required(),
        REDIS_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().required(),
        JWT_REFRESH_SECRET: Joi.string().required(),
        JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
        JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
        // Text AI provider (Groq by default)
        AI_PROVIDER: Joi.string().valid('groq', 'anthropic').default('groq'),
        AI_API_KEY: Joi.string().optional(),
        AI_MODEL: Joi.string().optional(),
        AI_BASE_URL: Joi.string().uri().optional(),
        // Vision AI — Gemini Flash (separate key from text AI)
        GEMINI_API_KEY: Joi.string().optional(),
        GEMINI_MODEL: Joi.string().default('gemini-2.0-flash'),
        // Email (Resend)
        RESEND_API_KEY: Joi.string().required(),
        EMAIL_FROM: Joi.string().default('noreply@gym.noetecha.com'),
        WEB_URL: Joi.string().uri().default('http://localhost:3000'),
      }),
    }),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('jwt.accessSecret'),
        signOptions: {
          expiresIn: config.getOrThrow<string>('jwt.accessExpiresIn'),
        },
      }),
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    RedisModule,
    HealthModule,
    IdentityModule,
    OrganizationModule,
    GymModule,
    StaffModule,
    MembershipPlansModule,
    MembersModule,
    CheckInsModule,
    RenewalsModule,
    AnnouncementsModule,
    ChatModule,
    CronModule,
    NotificationsModule,
    AiModule,
    LeaderboardModule,
    AdminModule,
    PublicModule,
    EmailModule,
    WorkoutsModule,
    BadgesModule,
    ReportsModule,
    AiInsightsModule,
  ],
})
export class AppModule {}
