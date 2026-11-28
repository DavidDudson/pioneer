import { describe, expect, test } from 'bun:test';

import { assert, property, string, webUrl } from 'fast-check';

import { HOME_PATH, ReturnPath, returnPathOr } from './return-path';

describe('returnPathOr', () => {
  test('keeps same-origin paths', () => {
    expect(returnPathOr('/characters/abc?tab=feats#top')).toBe(ReturnPath.parse('/characters/abc?tab=feats#top'));
    expect(returnPathOr('/')).toBe(HOME_PATH);
  });

  test.each(['/!', '/a[0]', '/~user', '/a?x=[1]'])('keeps %p, whose edge characters are valid', (requested) => {
    expect(returnPathOr(requested)).toBe(ReturnPath.parse(requested));
  });

  test.each([
    'https://evil.example/',
    '//evil.example',
    String.raw`/\evil.example`,
    'characters',
    '/characters\n',
    '/cha racters',
    '/a\u007F',
    '/é',
    '',
  ])('falls back home for %p', (requested) => {
    expect(returnPathOr(requested)).toBe(HOME_PATH);
  });

  test('falls back home when no path was requested', () => {
    // oxlint-disable-next-line unicorn/no-null -- URLSearchParams.get returns null for a missing parameter, so the function takes it
    expect(returnPathOr(null)).toBe(HOME_PATH);
    expect(returnPathOr(undefined)).toBe(HOME_PATH);
  });

  test('every accepted path stays on this origin', () => {
    assert(
      property(string(), (requested) => {
        const path = returnPathOr(requested);

        return new URL(path, 'https://pioneer.example').origin === 'https://pioneer.example';
      }),
    );
  });

  test('every accepted path stays on this origin, whatever URL-like input arrives', () => {
    assert(
      property(webUrl({ withQueryParameters: true, withFragments: true }), (url) => {
        const path = returnPathOr(url.replace(/^https?:/u, ''));

        return new URL(path, 'https://pioneer.example').origin === 'https://pioneer.example';
      }),
    );
  });
});
