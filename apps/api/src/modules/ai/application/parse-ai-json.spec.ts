import { parseAiJson } from './parse-ai-json';

describe('parseAiJson', () => {
  it('parses JSON wrapped in prose or code fences', () => {
    expect(parseAiJson('Sure!\n```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it.each([[''], ['no json here'], ['{"a": 1'], ['{not json}']])('rejects %j as a retryable 502', (raw) => {
    expect(() => parseAiJson(raw)).toThrow(expect.objectContaining({ statusCode: 502, code: 'AI_BAD_RESPONSE' }));
  });
});
