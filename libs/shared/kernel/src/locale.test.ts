import { describe, expect, test } from 'bun:test';

import { resolveLocale, TextDirection, textDirection } from './locale';

const supported = ['en', 'de', 'pt-BR'] as const;

describe('resolveLocale', () => {
  test('takes the first supported candidate in preference order', () => {
    expect(resolveLocale(['fr', 'de', 'en'], supported, 'en')).toBe('de');
  });

  test('matches exact tags ignoring case before language', () => {
    expect(resolveLocale(['PT-br'], supported, 'en')).toBe('pt-BR');
  });

  test('matches a regional tag by language', () => {
    expect(resolveLocale(['de-AT'], supported, 'en')).toBe('de');
    expect(resolveLocale(['pt-PT'], supported, 'en')).toBe('pt-BR');
  });

  test('falls back when nothing is supported', () => {
    expect(resolveLocale(['fr-FR', 'ja'], supported, 'en')).toBe('en');
    expect(resolveLocale([], supported, 'en')).toBe('en');
  });
});

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
