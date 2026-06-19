import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VISION_PROVIDER_PORT } from './vision-provider.port';
import { GeminiProvider } from './gemini.provider';

@Module({
  providers: [
    {
      provide: VISION_PROVIDER_PORT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): GeminiProvider => {
        const apiKey = config.get<string>('GEMINI_API_KEY', '');
        const model = config.get<string>('GEMINI_MODEL', 'gemini-2.0-flash');
        return new GeminiProvider(apiKey, model);
      },
    },
  ],
  exports: [VISION_PROVIDER_PORT],
})
export class VisionProviderModule {}
