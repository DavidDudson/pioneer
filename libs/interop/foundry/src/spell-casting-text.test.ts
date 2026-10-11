import { describe, expect, test } from 'bun:test';

import { primaryCheckOf, secondaryChecksOf } from './ritual-checks';
import { castTimeOf, durationOf, rangeOf } from './spell-casting-text';
import { targetsOf } from './spell-targets';

describe('castTimeOf', () => {
  test.each([
    ['2', { type: 'actions', cost: 'two' }],
    ['reaction', { type: 'actions', cost: 'reaction' }],
    ['Reaction', { type: 'actions', cost: 'reaction' }],
    ['free', { type: 'actions', cost: 'free' }],
    ['1 to 3', { type: 'actions', cost: 'one', upTo: 'three' }],
    ['1 or 2', { type: 'actions', cost: 'one', upTo: 'two' }],
    ['10 minutes', { type: 'time', count: 10, unit: 'minute' }],
    ['1 day', { type: 'time', count: 1, unit: 'day' }],
    ['1 week', { type: 'time', count: 1, unit: 'week' }],
  ])('%p', (text, expected) => {
    expect(castTimeOf(text)).toEqual(expected);
  });

  test.each(['2 to 2 rounds', '4 to 5', 'varies'])('%p does not map', (text) => {
    expect(castTimeOf(text)).toBeUndefined();
  });
});

describe('rangeOf', () => {
  test.each([
    ['30 feet', { type: 'feet', feet: 30 }],
    ['1,000 feet', { type: 'feet', feet: 1000 }],
    ['touch', { type: 'touch' }],
    ['planetary', { type: 'planetary' }],
    ['unlimited', { type: 'unlimited' }],
  ])('%p', (text, expected) => {
    expect(rangeOf(text)).toEqual(expected);
  });

  test.each(['varies', 'see text', '100 miles', 'touch or 30 feet', 'interplanar'])('%p does not map', (text) => {
    expect(rangeOf(text)).toBeUndefined();
  });
});

describe('durationOf', () => {
  test.each([
    [
      { value: '1 minute', sustained: false },
      { type: 'time', count: 1, unit: 'minute' },
    ],
    [
      { value: '1 minute', sustained: true },
      { type: 'time', count: 1, unit: 'minute', sustained: true },
    ],
    [{ value: '', sustained: true }, { type: 'sustained' }],
    [{ value: 'unlimited', sustained: false }, { type: 'unlimited' }],
    [
      { value: 'until the end of your turn', sustained: false },
      { type: 'until', until: 'turn-end' },
    ],
    [
      { value: 'until the start of your next turn', sustained: false },
      { type: 'until', until: 'next-turn-start' },
    ],
    [
      { value: "until the end of the target's next turn", sustained: false },
      { type: 'until', until: 'next-turn-end', of: 'target' },
    ],
    [
      { value: 'until the next time you make your daily preparations', sustained: false },
      { type: 'until', until: 'daily-preparations' },
    ],
  ])('%p', (duration, expected) => {
    expect(durationOf(duration)).toEqual(expected);
  });

  test.each([
    { value: 'varies', sustained: false },
    { value: 'up to 10 minutes', sustained: false },
    { value: '4d12 hours', sustained: false },
    { value: '1 round or sustained up to 1 minute', sustained: true },
  ])('%p does not map', (duration) => {
    expect(durationOf(duration)).toBeUndefined();
  });
});

describe('targetsOf', () => {
  test.each([
    ['1 creature', { any: [{ count: 1, of: 'creature' }] }],
    ['up to 5 creatures', { any: [{ count: 5, upTo: true, of: 'creature' }] }],
    ['one creature', { any: [{ count: 1, of: 'creature' }] }],
    ['1 willing living creature', { any: [{ count: 1, of: 'creature', qualifiers: ['willing', 'living'] }] }],
    [
      '1 creature or object',
      {
        any: [
          { count: 1, of: 'creature' },
          { count: 1, of: 'object' },
        ],
      },
    ],
    [
      '1 living creature or 1 willing undead creature',
      {
        any: [
          { count: 1, of: 'creature', qualifiers: ['living'] },
          { count: 1, of: 'creature', qualifiers: ['willing'], traits: ['undead'] },
        ],
      },
    ],
    [
      '1 spell effect or unattended magic item',
      {
        any: [
          { count: 1, of: 'spell-effect' },
          { count: 1, of: 'item', qualifiers: ['unattended', 'magical'] },
        ],
      },
    ],
    ['you and up to 4 allies', { any: [{ count: 4, upTo: true, of: 'ally' }], includesYou: true }],
    ['2 corpses', { any: [{ count: 2, of: 'corpse' }] }],
  ])('%p', (text, expected) => {
    expect(targetsOf(text)).toEqual(expected);
  });

  test.each([
    'the triggering creature',
    'any number of creatures',
    '1 creature you know by name',
    'you or 1 ally',
    '1 ally and 1 enemy',
    '1 creature, unattended object, or force construct',
  ])('%p does not map', (text) => {
    expect(targetsOf(text)).toBeUndefined();
  });
});

describe('ritual checks', () => {
  test.each([
    ['Religion', { skills: ['skill:religion'] }],
    ['Nature (master)', { skills: ['skill:nature'], proficiency: 'master' }],
    ['Arcana or Occultism (expert)', { skills: ['skill:arcana', 'skill:occultism'], proficiency: 'expert' }],
    [
      'Arcana (expert), Occultism (expert), or Religion (expert)',
      { skills: ['skill:arcana', 'skill:occultism', 'skill:religion'], proficiency: 'expert' },
    ],
    [
      'Cooking Lore (expert) or Crafting (expert)',
      { skills: ['skill:lore:cooking', 'skill:crafting'], proficiency: 'expert' },
    ],
  ])('primary %p', (text, expected) => {
    expect(primaryCheckOf(text)).toEqual(expected);
  });

  test.each([
    'Arcana (master) or Religion (expert)',
    'Nature (proficiency)',
    'DC 29 Nature or Religion',
    'Religion (expert; you must be a demon)',
    'Perception (master)',
  ])('primary %p does not map', (text) => {
    expect(primaryCheckOf(text)).toBeUndefined();
  });

  test.each([
    ['', []],
    ['Crafting', [{ skills: ['skill:crafting'] }]],
    ['Medicine, Society', [{ skills: ['skill:medicine'] }, { skills: ['skill:society'] }]],
    ['Society or Legal Lore', [{ skills: ['skill:society', 'skill:lore:legal'] }]],
  ])('secondary %p', (text, expected) => {
    expect(secondaryChecksOf(text)).toEqual(expected);
  });

  test.each(['Lore (any), Society, Survival', "Occultism or Religion (whichever isn't used for the primary check)"])(
    'secondary %p does not map',
    (text) => {
      expect(secondaryChecksOf(text)).toBeUndefined();
    },
  );
});
