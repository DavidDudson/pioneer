import { describe, expect, test } from 'bun:test';

import { slugify } from './foundry-slug';

describe('slugify', () => {
  test.each([
    ['Toughness', 'toughness'],
    ['Power Attack', 'power-attack'],
    ['Champion’s Reaction', 'champions-reaction'],
    ['Assurance (Athletics)', 'assurance-athletics'],
    ['  Spaced   Out  ', 'spaced-out'],
    ['Already-hyphenated -- name', 'already-hyphenated-name'],
    ['camelCase', 'camel-case'],
    ['Wand of Fireball (3rd-Rank Spell)', 'wand-of-fireball-3rd-rank-spell'],
    ['Élan', 'élan'],
    ['-', '-'],
  ])('%p is %p', (name, slug) => {
    expect(slugify(name)).toBe(slug);
  });
});
