import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AiResponse } from './ai-provider.port';
import type { VisionProviderPort } from './vision-provider.port';

export class GeminiProvider implements VisionProviderPort {
  private readonly client: GoogleGenerativeAI;
  private readonly model: string;

  constructor(apiKey: string, model = 'gemini-2.0-flash') {
    this.client = new GoogleGenerativeAI(apiKey);
    this.model = model;
  }

  async analyseImage(imageUrl: string, prompt: string, maxTokens: number): Promise<AiResponse> {
    // Fetch the image from Cloudinary and convert to base64 for the Gemini API
    const imageResponse = await fetch(imageUrl);
    const buffer = await imageResponse.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const mimeType = (imageResponse.headers.get('content-type') ?? 'image/jpeg') as string;

    const generativeModel = this.client.getGenerativeModel({
      model: this.model,
      generationConfig: { maxOutputTokens: maxTokens },
    });

    const result = await generativeModel.generateContent([
      { inlineData: { data: base64, mimeType } },
      prompt,
    ]);

    const text = result.response.text();
    const usage = result.response.usageMetadata;
    const tokensUsed = (usage?.promptTokenCount ?? 0) + (usage?.candidatesTokenCount ?? 0);

    return { text, tokensUsed };
  }
}
