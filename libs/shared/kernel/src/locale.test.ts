import { describe, expect, test } from 'bun:test';

import { TextDirection, textDirection } from './locale';

describe('textDirection', () => {
  test('is right to left for RTL languages, any region', () => {
    expect(textDirection('ar')).toBe(TextDirection.RightToLeft);
    expect(textDirection('he-IL')).toBe(TextDirection.RightToLeft);
  });

  test('is left to right otherwise', () => {
    expect(textDirection('en')).toBe(TextDirection.LeftToRight);
    expect(textDirection('de-AT')).toBe(TextDirection.LeftToRight);
  });
});
