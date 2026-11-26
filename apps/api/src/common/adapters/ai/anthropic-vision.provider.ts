import Anthropic from '@anthropic-ai/sdk';
import type { AiResponse } from './ai-provider.port';
import type { VisionProviderPort } from './vision-provider.port';

type SupportedMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
const SUPPORTED: SupportedMediaType[] = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

/**
 * Vision provider backed by the Claude (Anthropic) API — powers the "Log a Meal"
 * food-photo analysis.
 *
 * The image (a Cloudinary URL from the upload step) is downloaded here and sent to
 * Claude as base64, mirroring the previous Gemini provider. We fetch it ourselves
 * rather than passing the URL to Claude because Anthropic's server-side fetcher is
 * blocked by some image hosts (hotlink protection); our API server can always reach
 * the upload URL.
 *
 * Thinking is intentionally left off (Opus 4.x runs without thinking when the
 * `thinking` field is omitted) — meal-macro extraction is a simple structured task
 * and the prompt already asks for JSON-only output.
 */
export class AnthropicVisionProvider implements VisionProviderPort {
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(apiKey: string, model = 'claude-haiku-4-5') {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async analyseImage(imageUrl: string, prompt: string, maxTokens: number): Promise<AiResponse> {
    const imageResponse = await fetch(imageUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image (${imageResponse.status})`);
    }
    const base64 = Buffer.from(await imageResponse.arrayBuffer()).toString('base64');
    const mediaType = normalizeMediaType(imageResponse.headers.get('content-type'));

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: maxTokens,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
            { type: 'text', text: prompt },
          ],
        },
      ],
    });

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('');

    return {
      text,
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      model: this.model,
    };
  }
}

/** Claude accepts only jpeg/png/gif/webp; default to jpeg for anything else. */
function normalizeMediaType(contentType: string | null): SupportedMediaType {
  const base = (contentType ?? '').split(';')[0].trim().toLowerCase();
  return SUPPORTED.includes(base as SupportedMediaType) ? (base as SupportedMediaType) : 'image/jpeg';
}
