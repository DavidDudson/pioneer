import { describe, expect, test } from 'bun:test';

import { ContentEntry, ContentId, contentId, ContentKey, EntrySlug, PackId, StaffSpells } from '@pioneer/rules/sdk';

import { matchStaffSpells, spellIndex, staffMatches } from './staff-matcher';

const PACK = 'gm-core';
const idOf = (slug: string): ContentId => ContentId.parse(contentId(PackId.parse(PACK), EntrySlug.parse(slug)));

const text = (words: string, marks?: readonly string[]): object => ({
  type: 'text',
  text: words,
  ...(marks === undefined ? {} : { marks }),
});
const item = (rank: string, spells: string): object[] => [
  { type: 'paragraph', content: [text(rank, ['strong']), text(` ${spells}`)] },
];
const list = (...items: readonly object[][]): object => ({ type: 'list', ordered: false, items });

/** A Game Master Core entry of `kind`; the spells' data is what a spell needs. */
function entry(slug: string, name: string, fields: object): ContentEntry {
  return ContentEntry.parse({
    id: idOf(slug),
    pack: PACK,
    slug,
    name,
    level: 1,
    rarity: 'common',
    traits: [],
    sources: [{ kind: 'book', book: 'gm-core', page: 1 }],
    description: [],
    rules: [],
    ...fields,
  });
}

const SPELL_DATA = {
  data: {
    rank: 1,
    time: { type: 'actions', cost: 'two' },
    range: { type: 'feet', feet: 30 },
    duration: { type: 'unlimited' },
    traditions: ['arcane'],
    damage: [],
  },
};
const spellSlug = (name: string): string =>
  `spell:${name
    .toLowerCase()
    .replaceAll(/[^a-z ]/gu, '')
    .replaceAll(' ', '-')}`;

function spell(name: string): ContentEntry {
  return entry(spellSlug(name), name, { kind: 'spell', ...SPELL_DATA });
}

const SPELLS = [
  'Ignition',
  'Breathe Fire',
  'Floating Flame',
  'Fireball',
  'Clear Mind',
  'Heal',
  'Sound Body',
  'Wall of Fire',
  'Fire Shield',
  'Warrior’s Regret',
].map((name) => spell(name));

function staff(
  slug: string,
  description: readonly object[],
  traits: readonly string[] = ['magical', 'staff'],
): ContentEntry {
  return entry(`weapon:${slug}`, slug, {
    kind: 'weapon',
    traits,
    description,
    data: {
      bulk: 1,
      category: 'simple',
      damage: { dice: 1, die: 'd6', damageType: 'bludgeoning' },
      usage: { type: 'held', hands: 'one' },
    },
  });
}

const idsOf = (...names: readonly string[]): readonly ContentId[] => names.map((name) => idOf(spellSlug(name)));
const index = spellIndex(SPELLS);
const read = (...items: readonly object[][]): StaffSpells | undefined =>
  matchStaffSpells(staff('test', [list(...items)]), index);

describe('matchStaffSpells', () => {
  test('reads each rank and its spells, comma separated', () => {
    expect(
      read(item('Cantrip', 'Ignition'), item('1st', 'Breathe Fire'), item('3rd', 'Floating Flame, Fireball')),
    ).toEqual(
      StaffSpells.parse([
        { rank: 'cantrip', spells: idsOf('Ignition') },
        { rank: 1, spells: idsOf('Breathe Fire') },
        { rank: 3, spells: idsOf('Floating Flame', 'Fireball') },
      ]),
    );
  });

  test('splits names that run together where the links were lost', () => {
    expect(read(item('2nd', 'Clear Mind Heal Sound Body'))).toEqual(
      StaffSpells.parse([{ rank: 2, spells: idsOf('Clear Mind', 'Heal', 'Sound Body') }]),
    );
    expect(read(item('4th', 'Fire Shield, Fireball Wall of Fire'))).toEqual(
      StaffSpells.parse([{ rank: 4, spells: idsOf('Fire Shield', 'Fireball', 'Wall of Fire') }]),
    );
  });

  test('reads a plural cantrip label, a curly apostrophe and a spell named at two ranks', () => {
    expect(read(item('Cantrips', 'Ignition'), item('2nd', 'Warrior’s Regret'), item('3rd', 'Heal'))).toEqual(
      StaffSpells.parse([
        { rank: 'cantrip', spells: idsOf('Ignition') },
        { rank: 2, spells: idsOf('Warrior’s Regret') },
        { rank: 3, spells: idsOf('Heal') },
      ]),
    );
  });

  test('keeps a spell named twice under a rank once', () => {
    expect(read(item('1st', 'Heal, Heal'))).toEqual(StaffSpells.parse([{ rank: 1, spells: idsOf('Heal') }]));
  });

  test.each([
    { reason: 'a name no pack holds', unread: item('1st', 'Concordant Choir') },
    { reason: 'a note in brackets', unread: item('1st', 'Fireball (water only)') },
    { reason: 'no spells after the rank', unread: item('1st', '') },
    { reason: 'a label that is not a rank', unread: item('Focus', 'Heal') },
  ])('leaves a list with $reason alone', ({ unread }) => {
    expect(read(item('Cantrip', 'Ignition'), unread)).toBeUndefined();
  });

  test('leaves a staff with no list, or with two, alone', () => {
    const none = staff('none', []);
    const two = staff('two', [list(item('1st', 'Heal')), list(item('2nd', 'Heal'))]);

    expect(matchStaffSpells(none, index)).toBeUndefined();
    expect(matchStaffSpells(two, index)).toBeUndefined();
  });

  test('leaves alone a list that splits into spell names in more than one way', () => {
    const doubled = spellIndex([...SPELLS, spell('Heal Sound'), spell('Body')]);
    const ambiguous = staff('ambiguous', [list(item('2nd', 'Heal Sound Body'))]);

    expect(matchStaffSpells(ambiguous, doubled)).toBeUndefined();
  });

  test('leaves alone a name two spells share', () => {
    const twin = entry('spell:heal-again', 'Heal', { kind: 'spell', ...SPELL_DATA });
    const shared = spellIndex([...SPELLS, twin]);

    const sharing = staff('shared', [list(item('1st', 'Heal'))]);

    expect(matchStaffSpells(sharing, shared)).toBeUndefined();
  });
});

describe('staffMatches', () => {
  test('matches staves with the staff trait that have no spells yet', () => {
    const fire = staff('fire', [list(item('Cantrip', 'Ignition'))]);
    const plain = staff('plain', [list(item('Cantrip', 'Ignition'))], ['magical']);
    const typed = ContentEntry.parse({
      ...fire,
      slug: 'weapon:typed',
      id: idOf('weapon:typed'),
      data: { ...fire.data, staff: [{ rank: 'cantrip', spells: idsOf('Heal') }] },
    });

    expect(staffMatches([...SPELLS, fire, plain, typed])).toEqual([
      {
        entry: ContentKey.parse('gm-core/weapon:fire'),
        staff: StaffSpells.parse([{ rank: 'cantrip', spells: idsOf('Ignition') }]),
      },
    ]);
  });
});
