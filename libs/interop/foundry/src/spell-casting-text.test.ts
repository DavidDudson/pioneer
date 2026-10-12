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
    ['interplanar', { type: 'interplanar' }],
    ['100 miles', { type: 'miles', miles: 100 }],
    ['1 mile', { type: 'miles', miles: 1 }],
    ['half a mile', { type: 'miles', miles: 0.5 }],
    ['touch or 30 feet', { type: 'either', options: [{ type: 'touch' }, { type: 'feet', feet: 30 }] }],
  ])('%p', (text, expected) => {
    expect(rangeOf(text)).toEqual(expected);
  });

  test.each(['varies', 'see text', '30-foot cone', 'emanation up to 40-feet', 'touch or varies'])(
    '%p does not map',
    (text) => {
      expect(rangeOf(text)).toBeUndefined();
    },
  );
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
    [{ value: 'varies', sustained: false }, { type: 'varies' }],
    [{ value: 'see text', sustained: false }, { type: 'varies' }],
    [{ value: 'see below', sustained: false }, { type: 'varies' }],
    [{ value: '1 or more rounds', sustained: false }, { type: 'varies' }],
    [{ value: '1 or more rounds (see below)', sustained: false }, { type: 'varies' }],
    [
      { value: 'up to 10 minutes', sustained: false },
      { type: 'time', count: 10, unit: 'minute', upTo: true },
    ],
    [
      { value: '4d12 hours', sustained: false },
      { type: 'rolled', dice: 4, die: 'd12', unit: 'hour' },
    ],
    [
      { value: '10 minutes or 8 hours', sustained: false },
      {
        type: 'either',
        options: [
          { type: 'time', count: 10, unit: 'minute' },
          { type: 'time', count: 8, unit: 'hour' },
        ],
      },
    ],
    [
      { value: '1 round or sustained up to 1 minute', sustained: true },
      {
        type: 'either',
        options: [
          { type: 'time', count: 1, unit: 'round' },
          { type: 'time', count: 1, unit: 'minute', sustained: true },
        ],
      },
    ],
  ])('%p', (duration, expected) => {
    expect(durationOf(duration)).toEqual(expected);
  });

  test.each([
    { value: 'varies', sustained: true },
    { value: '10 minutes or 8 hours', sustained: true },
    { value: '1 minute or until used (see text)', sustained: false },
    { value: 'until full tribute is paid', sustained: false },
    { value: '4d20 hours', sustained: false },
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
    ['you and up to 4 allies', { any: [{ count: 4, upTo: true, of: 'ally' }], you: 'and' }],
    ['2 corpses', { any: [{ count: 2, of: 'corpse' }] }],
  ])('%p', (text, expected) => {
    expect(targetsOf(text)).toEqual(expected);
  });

  test.each([
    ['The triggering creature', { any: [{ count: 1, triggering: true, of: 'creature' }] }],
    [
      'the triggering creature or object',
      {
        any: [
          { count: 1, triggering: true, of: 'creature' },
          { count: 1, triggering: true, of: 'object' },
        ],
      },
    ],
    ['you and the triggering ally', { any: [{ count: 1, triggering: true, of: 'ally' }], you: 'and' }],
    ['you or the triggering ally', { any: [{ count: 1, triggering: true, of: 'ally' }], you: 'or' }],
  ])('the triggering one: %p', (text, expected) => {
    expect(targetsOf(text)).toEqual(expected);
  });

  test.each([
    ['your animal companion', { any: [{ count: 1, of: 'animal-companion' }] }],
    ['your familiar', { any: [{ count: 1, of: 'familiar' }] }],
    ['your eidolon', { any: [{ count: 1, of: 'eidolon' }] }],
    ['1 willing creature that is your companion', { any: [{ count: 1, of: 'companion', qualifiers: ['willing'] }] }],
  ])('a companion: %p', (text, expected) => {
    expect(targetsOf(text)).toEqual(expected);
  });

  test.each([
    ['any number of creatures', { any: [{ count: 'any', of: 'creature' }] }],
    ['any number of living creatures', { any: [{ count: 'any', of: 'creature', qualifiers: ['living'] }] }],
    ['1 or more creatures', { any: [{ count: 'any', of: 'creature' }] }],
    ['1 or any number of creatures', { any: [{ count: 'any', of: 'creature' }] }],
    [
      'you and any number of willing allies',
      { any: [{ count: 'any', of: 'ally', qualifiers: ['willing'] }], you: 'and' },
    ],
    ['1 to 3 willing creatures', { any: [{ count: 3, upTo: true, of: 'creature', qualifiers: ['willing'] }] }],
    ['1 or 2 creatures', { any: [{ count: 2, upTo: true, of: 'creature' }] }],
  ])('a count in words: %p', (text, expected) => {
    expect(targetsOf(text)).toEqual(expected);
  });

  test.each([
    ['all creatures in range', { any: [{ count: 'all', within: 'range', of: 'creature' }] }],
    ['enemies in the area', { any: [{ count: 'all', within: 'area', of: 'enemy' }] }],
    ['you and allies in the area', { any: [{ count: 'all', within: 'area', of: 'ally' }], you: 'and' }],
  ])('all of them in the area or range: %p', (text, expected) => {
    expect(targetsOf(text)).toEqual(expected);
  });

  test.each([
    ['you or 1 ally', { any: [{ count: 1, of: 'ally' }], you: 'or' }],
    ['1 ally and 1 enemy', { any: [{ count: 1, of: 'ally' }], plus: [{ count: 1, of: 'enemy' }] }],
    ['1 enemy', { any: [{ count: 1, of: 'enemy' }] }],
  ])('the caster instead, or a target as well: %p', (text, expected) => {
    expect(targetsOf(text)).toEqual(expected);
  });

  test.each([
    [
      '1 animal, beast, fey, fungus, or plant',
      {
        any: ['animal', 'beast', 'fey', 'fungus', 'plant'].map((trait) => ({
          count: 1,
          of: 'creature',
          traits: [trait],
        })),
      },
    ],
    ['1 extraplanar creature', { any: [{ count: 1, of: 'creature', traits: ['extraplanar'] }] }],
    ['1 dead creature', { any: [{ count: 1, of: 'creature', qualifiers: ['dead'] }] }],
    [
      '1 willing living animal',
      { any: [{ count: 1, of: 'creature', qualifiers: ['willing', 'living'], traits: ['animal'] }] },
    ],
    ['1 willing sleeping creature', { any: [{ count: 1, of: 'creature', qualifiers: ['willing', 'sleeping'] }] }],
    ['1 corporeal creature', { any: [{ count: 1, of: 'creature', qualifiers: ['corporeal'] }] }],
  ])('a creature by trait or state: %p', (text, expected) => {
    expect(targetsOf(text)).toEqual(expected);
  });

  test.each([
    '1 creature you know by name',
    '1 creature of a level no greater than double the geas ritual’s rank',
    '1 dead creature of 13th level or lower',
    '1 or 10 creatures',
    '1 creature, unattended object, or force construct',
    '1 creature or object tracked and up to 5 other willing creatures',
    'dead creatures and living creatures of your choice within range',
    'each ally targeted by the triggering spell',
    '1 creature in range',
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
