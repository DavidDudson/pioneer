import { describe, expect, test } from 'bun:test';

import { primaryCheckOf, secondaryChecksOf } from './ritual-checks';

describe('ritual checks: ranks and notes', () => {
  test.each([
    ['Arcana (mythic) or Occultism (mythic)', { skills: ['skill:arcana', 'skill:occultism'], mythic: true }],
    ['Nature (mythic)', { skills: ['skill:nature'], mythic: true }],
    [
      'Religion (expert; you must be a demon)',
      { skills: ['skill:religion'], proficiency: 'expert', note: 'you must be a demon' },
    ],
    [
      'Arcana or Occultism (expert, the check has the secret trait)',
      { skills: ['skill:arcana', 'skill:occultism'], proficiency: 'expert', note: 'the check has the secret trait' },
    ],
  ])('primary %p', (text, expected) => {
    expect(primaryCheckOf(text)).toEqual(expected);
  });

  test.each([
    'Arcana (mythic) or Occultism (expert)',
    "skill corresponding to the target's casting tradition (trained)",
    "Arcana, Nature, Occultism, or Religion matching the ley line's tradition (legendary)",
  ])('primary %p does not map', (text) => {
    expect(primaryCheckOf(text)).toBeUndefined();
  });
});

describe('ritual checks: a list ending in or', () => {
  test.each([
    ['Diplomacy, Intimidation, or Society', [{ skills: ['skill:diplomacy', 'skill:intimidation', 'skill:society'] }]],
    ['Occultism, or Society', [{ skills: ['skill:occultism', 'skill:society'] }]],
    [
      'DC 18 Acrobatics, Nature, or Performance',
      [{ skills: ['skill:acrobatics', 'skill:nature', 'skill:performance'], dc: 18 }],
    ],
    [
      'Art Lore (trained), Crafting (trained), or Thievery (trained)',
      [{ skills: ['skill:lore:art', 'skill:crafting', 'skill:thievery'], proficiency: 'trained' }],
    ],
    [
      'Arcana, Nature, Occultism, Religion (cannot be the same skill as for the primary check)',
      [
        {
          skills: ['skill:arcana', 'skill:nature', 'skill:occultism', 'skill:religion'],
          pick: 'primary-unused',
        },
      ],
    ],
  ])('secondary %p', (text, expected) => {
    expect(secondaryChecksOf(text)).toEqual(expected);
  });

  test.each(['Arcana or Occultism, or Crafting or Survival', 'Fortitude, Society, Will'])(
    'secondary %p does not map',
    (text) => {
      expect(secondaryChecksOf(text)).toBeUndefined();
    },
  );
});
