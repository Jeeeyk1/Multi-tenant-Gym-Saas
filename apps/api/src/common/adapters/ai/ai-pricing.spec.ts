import { costUsdMicros, priceFor } from './ai-pricing';

describe('ai pricing', () => {
  it('charges input and output tokens at the model price', () => {
    // 1,000 in at $1/M + 500 out at $5/M = $0.0035 = 3,500 micros
    expect(costUsdMicros('claude-haiku-4-5', 1000, 500)).toBe(3500);
  });

  it('matches dated model ids by prefix', () => {
    expect(priceFor('claude-haiku-4-5-20251001')).toMatchObject({ input: 1, known: true });
  });

  it('charges an unknown model at the highest price', () => {
    expect(priceFor('some-new-model')).toMatchObject({ input: 15, output: 75, known: false });
  });
});
