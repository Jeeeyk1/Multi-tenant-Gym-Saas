import { AiResponseError } from '../../../common/errors';

/**
 * Pulls the JSON object out of a model reply (which may be wrapped in prose or code
 * fences) and parses it. An empty, truncated or non-JSON reply becomes a 502 the
 * client can retry, instead of an unhandled 500.
 */
export function parseAiJson<T = Record<string, unknown>>(raw: string): T {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end <= start) throw new AiResponseError();
  try {
    return JSON.parse(raw.slice(start, end + 1)) as T;
  } catch {
    throw new AiResponseError();
  }
}
