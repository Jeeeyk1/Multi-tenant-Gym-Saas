import { Logger } from '@nestjs/common';

const logger = new Logger('AiPricing');

/**
 * What each model costs us, in US dollars per million tokens. Used to charge every AI call
 * against the gym's monthly AI allowance (see ai_usage_log.cost_usd_micros).
 * Check these against the provider price lists when models or prices change.
 */
const PRICES_USD_PER_MTOK: Record<string, { input: number; output: number }> = {
  'claude-haiku-4-5': { input: 1, output: 5 },
  'claude-sonnet-4-6': { input: 3, output: 15 },
  'claude-sonnet-4-5': { input: 3, output: 15 },
  'claude-opus-4-8': { input: 15, output: 75 },
  'openai/gpt-oss-120b': { input: 0.15, output: 0.75 },
  'openai/gpt-oss-20b': { input: 0.1, output: 0.5 },
  'gemini-2.5-flash': { input: 0.3, output: 2.5 },
};

// An unknown model is charged at the most expensive known price, so a config typo can't make AI free.
const FALLBACK_PRICE = { input: 15, output: 75 };

export function priceFor(model: string): { input: number; output: number; known: boolean } {
  const exact = PRICES_USD_PER_MTOK[model];
  if (exact) return { ...exact, known: true };
  const prefix = Object.keys(PRICES_USD_PER_MTOK).find((m) => model.startsWith(m));
  if (prefix) return { ...PRICES_USD_PER_MTOK[prefix], known: true };
  logger.warn(`no price for model "${model}": charged at the highest known price. Add it to ai-pricing.ts.`);
  return { ...FALLBACK_PRICE, known: false };
}

/** Cost of one call in micro-dollars (1 USD = 1,000,000), rounded up. */
export function costUsdMicros(model: string, inputTokens: number, outputTokens: number): number {
  const { input, output } = priceFor(model);
  return Math.ceil(inputTokens * input + outputTokens * output);
}
