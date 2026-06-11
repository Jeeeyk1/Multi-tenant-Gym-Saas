import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AI_PROVIDER_PORT } from './ai-provider.port';
import { GroqProvider } from './groq.provider';
import { AnthropicProvider } from './anthropic.provider';

@Module({
  providers: [
    {
      provide: AI_PROVIDER_PORT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): GroqProvider | AnthropicProvider => {
        const provider = config.get<string>('AI_PROVIDER', 'groq');
        // Falls back to empty string — first real AI call will throw an auth error
        // which is the correct behaviour when AI_API_KEY is not configured.
        const apiKey = config.get<string>('AI_API_KEY', '');
        const model = config.get<string>('AI_MODEL');

        if (provider === 'anthropic') {
          const baseURL = config.get<string>('AI_BASE_URL', 'https://api.anthropic.com');
          return new AnthropicProvider(apiKey, model, baseURL);
        }

        // Default: Groq (OpenAI-compatible)
        const baseURL = config.get<string>('AI_BASE_URL', 'https://api.groq.com/openai/v1');
        return new GroqProvider(apiKey, baseURL, model);
      },
    },
  ],
  exports: [AI_PROVIDER_PORT],
})
export class AiProviderModule {}
