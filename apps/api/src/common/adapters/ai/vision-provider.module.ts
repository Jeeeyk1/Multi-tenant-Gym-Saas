import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VISION_PROVIDER_PORT } from './vision-provider.port';
import { AnthropicVisionProvider } from './anthropic-vision.provider';

@Module({
  providers: [
    {
      provide: VISION_PROVIDER_PORT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): AnthropicVisionProvider => {
        // "Log a Meal" photo analysis runs on the Claude (Anthropic) vision API.
        // Reuses ANTHROPIC_API_KEY (same key as AI Insights); model is overridable
        // via ANTHROPIC_VISION_MODEL without a code change.
        const apiKey = config.get<string>('ANTHROPIC_API_KEY', '');
        const model = config.get<string>('ANTHROPIC_VISION_MODEL', 'claude-haiku-4-5');
        return new AnthropicVisionProvider(apiKey, model);
      },
    },
  ],
  exports: [VISION_PROVIDER_PORT],
})
export class VisionProviderModule {}
