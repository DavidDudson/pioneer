import { describe, expect, test } from 'bun:test';

import { defaultFlag, kebab } from './foundry-flags';
import { slugify } from './foundry-slug';

describe('kebab', () => {
  test('turns a camel-case flag into a slug', () => {
    expect(kebab('druidicOrder')).toBe('druidic-order');
  });
});

describe('defaultFlag', () => {
  test('is the name as hyphenated lower-case words', () => {
    expect(defaultFlag('Align the Stars')).toBe('align-the-stars');
  });

  test('turns an apostrophe into a hyphen, where slugify drops it', () => {
    expect(defaultFlag("Champion's Reaction")).toBe('champion-s-reaction');
    expect(slugify("Champion's Reaction")).toBe('champions-reaction');
  });
});
