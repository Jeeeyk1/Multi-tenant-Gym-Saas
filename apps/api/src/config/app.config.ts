import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3001', 10),
  apiPrefix: process.env.API_PREFIX ?? 'api',
  // Allowed browser origins for CORS (HTTP + WebSocket). Set CORS_ORIGINS in
  // production to the real frontend domains (web/admin/landing), comma-separated.
  // Defaults to the local dev ports when unset.
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000,http://localhost:3002,http://localhost:3003')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
}));
