import { describe, expect, test } from 'bun:test';

import { CHARACTER_PROSE_MAX_LENGTH, CharacterProseInput } from './character-prose';

describe('CharacterProseInput', () => {
  test('trims', () => {
    expect(CharacterProseInput.parse('  Tall  ')).toBe(CharacterProseInput.parse('Tall'));
  });

  test('allows empty, which clears the field', () => {
    expect(CharacterProseInput.safeParse('').success).toBe(true);
  });

  test('refuses text over the limit', () => {
    expect(CharacterProseInput.safeParse('a'.repeat(CHARACTER_PROSE_MAX_LENGTH + 1)).success).toBe(false);
  });
});
