import { describe, expect, test } from 'bun:test';

import { primaryCheckOf, secondaryChecksOf } from './ritual-checks';
import { castTimeOf, durationOf, rangeOf } from './spell-casting-text';

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
    [
      'Arcana (master) or Religion (expert)',
      {
        skills: ['skill:arcana', 'skill:religion'],
        ranked: [
          { skill: 'skill:arcana', proficiency: 'master' },
          { skill: 'skill:religion', proficiency: 'expert' },
        ],
      },
    ],
    ['DC 29 Nature or Religion', { skills: ['skill:nature', 'skill:religion'], dc: 29 }],
    [
      'Arcana (expert), Nature (expert), Occultism (expert), or Religion (expert) as determined by the tradition of spell cast in the ritual',
      {
        skills: ['skill:arcana', 'skill:nature', 'skill:occultism', 'skill:religion'],
        proficiency: 'expert',
        pick: 'tradition',
      },
    ],
  ])('primary %p', (text, expected) => {
    expect(primaryCheckOf(text)).toEqual(expected);
  });

  test.each([
    'Nature (proficiency)',
    'Arcana (master) or Religion (proficiency)',
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
    [
      'Lore (any), Society, Survival',
      [{ skills: ['skill:lore'] }, { skills: ['skill:society'] }, { skills: ['skill:survival'] }],
    ],
    [
      'Lore (related to the destination plane), Survival',
      [{ skills: ['skill:lore'], loreRelatedTo: 'the destination plane' }, { skills: ['skill:survival'] }],
    ],
    [
      'Nature or Religion (whichever is used for the primary check)',
      [{ skills: ['skill:nature', 'skill:religion'], pick: 'primary-used' }],
    ],
    [
      'Nature, Occultism or Religion (whichever is used for the primary check)',
      [{ skills: ['skill:nature', 'skill:occultism', 'skill:religion'], pick: 'primary-used' }],
    ],
    [
      'Arcana, Nature, Occultism or Religion (whichever is used for the primary check)',
      [{ skills: ['skill:arcana', 'skill:nature', 'skill:occultism', 'skill:religion'], pick: 'primary-used' }],
    ],
    [
      "Occultism or Religion (whichever isn't used for the primary check)",
      [{ skills: ['skill:occultism', 'skill:religion'], pick: 'primary-unused' }],
    ],
    [
      "Diplomacy or Intimidation; Arcana or Occultism (whichever isn't used for the primary check)",
      [
        { skills: ['skill:diplomacy', 'skill:intimidation'] },
        { skills: ['skill:arcana', 'skill:occultism'], pick: 'primary-unused' },
      ],
    ],
  ])('secondary %p', (text, expected) => {
    expect(secondaryChecksOf(text)).toEqual(expected);
  });

  test.each([
    'Lore (sometimes), Society',
    'Lore (any), Society, Nature or Religion (whichever is used for the primary check)',
    'Religion (you must be a demon)',
    "Nature (whichever is used for the primary check) or Religion (whichever isn't used for the primary check)",
  ])('secondary %p does not map', (text) => {
    expect(secondaryChecksOf(text)).toBeUndefined();
  });
});
