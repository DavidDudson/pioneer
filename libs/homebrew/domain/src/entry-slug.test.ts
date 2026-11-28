import { describe, expect, test } from 'bun:test';

import { ContentText, Slug } from '@pioneer/rules/sdk';

import { nameSlug } from './entry-slug';

describe('nameSlug', () => {
  test.each([
    ['Rending Strike', 'rending-strike'],
    ["Fire Giant's Axe", 'fire-giant-s-axe'],
    ['  Säiling  Lore!! ', 'sailing-lore'],
    ['Level 5 Dragon', 'level-5-dragon'],
  ])('%s is filed as %s', (name, expected) => {
    expect(nameSlug(ContentText.parse(name))).toBe(Slug.parse(expected));
  });

  test('a name with no letters or digits has no slug', () => {
    expect(nameSlug(ContentText.parse('???'))).toBeUndefined();
  });
});
