import { randomBytes } from 'crypto';

/**
 * Safe character set for the random suffix.
 * Excludes ambiguous characters: 0, O, 1, I, L.
 */
const SAFE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 12;
const NAME_PART_MAX = 7;

/**
 * Generates the name-derived prefix of a gym code.
 *
 * Algorithm:
 * 1. Uppercase the name
 * 2. Keep only alphanumeric characters
 * 3. Remove vowels (A, E, I, O, U)
 * 4. Take the first NAME_PART_MAX characters
 *
 * @returns 0–7 character string (may be empty for edge-case names)
 */
function deriveNamePart(gymName: string): string {
  return gymName
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .replace(/[AEIOU]/g, '')
    .slice(0, NAME_PART_MAX);
}

/**
 * Generates a random suffix of the given length using the safe character set.
 */
function randomSuffix(length: number): string {
  // Use randomBytes for cryptographic randomness
  const bytes = randomBytes(length * 2);
  let result = '';
  for (let i = 0; i < bytes.length && result.length < length; i++) {
    const index = bytes[i] % SAFE_CHARS.length;
    result += SAFE_CHARS[index];
  }
  return result;
}

/**
 * Generates a candidate gym code from the gym name.
 * The caller is responsible for uniqueness checking and retries.
 */
export function generateGymCode(gymName: string): string {
  const namePart = deriveNamePart(gymName);
  const suffixLength = CODE_LENGTH - namePart.length;
  return namePart + randomSuffix(suffixLength);
}

/**
 * Generates a fully random 12-character fallback code.
 * Used when all name-based attempts collide.
 */
export function generateFallbackCode(): string {
  return randomSuffix(CODE_LENGTH);
}
