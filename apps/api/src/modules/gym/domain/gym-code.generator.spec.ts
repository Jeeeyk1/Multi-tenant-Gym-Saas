import { generateGymCode, generateFallbackCode } from './gym-code.generator';

describe('generateGymCode', () => {
  it('produces a 12-character uppercase string', () => {
    const code = generateGymCode('Anytime Fitness');
    expect(code).toHaveLength(12);
    expect(code).toBe(code.toUpperCase());
  });

  it('strips vowels and non-alphanumeric chars from the gym name', () => {
    // "Iron Gym" → strip spaces → "IronGym" → uppercase → "IRONGYM"
    // → remove vowels → "RNGYM" → first 7 → "RNGYM" → + 7 random = 12 total
    const code = generateGymCode('Iron Gym');
    expect(code.startsWith('RNGYM')).toBe(true);
    expect(code).toHaveLength(12);
  });

  it('does not include ambiguous characters (0, O, 1, I, L) in the suffix', () => {
    // Run many times to catch probabilistic failures
    for (let i = 0; i < 200; i++) {
      const code = generateGymCode('Test');
      // The suffix is everything after the name part "TST" (3 chars)
      const suffix = code.slice(3);
      expect(suffix).not.toMatch(/[01ILO]/);
    }
  });

  it('handles a very short gym name', () => {
    const code = generateGymCode('AB');
    expect(code).toHaveLength(12);
  });

  it('handles a gym name that becomes empty after stripping', () => {
    // All vowels, stripped to nothing
    const code = generateGymCode('AEIOU');
    expect(code).toHaveLength(12);
  });

  it('produces different codes on successive calls (randomness)', () => {
    const codes = new Set(Array.from({ length: 10 }, () => generateGymCode('Fit')));
    // With 10 calls, at least 2 should differ
    expect(codes.size).toBeGreaterThan(1);
  });
});

describe('generateFallbackCode', () => {
  it('produces a 12-character uppercase string', () => {
    const code = generateFallbackCode();
    expect(code).toHaveLength(12);
    expect(code).toBe(code.toUpperCase());
  });

  it('does not include ambiguous characters', () => {
    for (let i = 0; i < 100; i++) {
      expect(generateFallbackCode()).not.toMatch(/[01ILO]/);
    }
  });
});
