import { describe, expect, test } from 'bun:test';

import { array, assert, constantFrom, property, string } from 'fast-check';

import { resolveLocale } from './locale';

const supported = ['en', 'de', 'pt-BR'] as const;
const candidateLists = array(string());
const supportedLocale = constantFrom(...supported);

function alwaysSupported(candidates: readonly string[]): void {
  expect(supported).toContain(resolveLocale(candidates, supported, 'en'));
}

function preferredWins(preferred: (typeof supported)[number], rest: readonly string[]): void {
  expect(resolveLocale([preferred, ...rest], supported, 'en')).toBe(preferred);
}

describe('resolveLocale (properties)', () => {
  test('always returns a supported locale', () => {
    assert(property(candidateLists, alwaysSupported));
  });

  test('a supported candidate wins over anything after it', () => {
    assert(property(supportedLocale, candidateLists, preferredWins));
  });
});
