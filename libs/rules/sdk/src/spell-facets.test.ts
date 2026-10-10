import { describe, expect, test } from 'bun:test';

import { ContentEntry } from './content-entry';
import { contentId, PackId, Slug } from './content-id';
import { facetValues } from './facet';
import { SPELL_FACETS } from './spell-facets';

const PACK = 'player-core';
const prose = [{ type: 'paragraph', content: [{ type: 'text', text: 'A spell.' }] }];

/** A Player Core spell with `data` merged over a two-action, arcane, rank 1 cantrip-free base. */
function spell(slug: string, data: object, traits: readonly string[] = []): ContentEntry {
  return ContentEntry.parse({
    id: contentId(PackId.parse(PACK), Slug.parse(slug)),
    pack: PACK,
    kind: 'spell',
    slug,
    name: slug,
    rarity: 'common',
    traits,
    sources: [{ kind: 'book', book: 'player-core', page: 1 }],
    description: prose,
    rules: [],
    data: { rank: 1, traditions: ['arcane'], time: { type: 'actions', cost: 'two' }, damage: [], ...data },
  });
}

/** Every spell facet's values for `entry`, keyed by facet id. */
function valuesOf(entry: ContentEntry): Record<string, readonly string[]> {
  return Object.fromEntries(SPELL_FACETS.map((facet) => [facet.id, facetValues(entry, facet)]));
}

const fireball = spell(
  'fireball',
  {
    rank: 3,
    traditions: ['arcane', 'primal'],
    range: { type: 'feet', feet: 500 },
    area: { shape: 'burst', size: 20 },
    defense: { save: { statistic: 'save:reflex', basic: true } },
    damage: [{ key: '0', formula: '6d6', damageType: 'fire', kinds: ['damage'] }],
    heightening: { type: 'interval', interval: 1, damage: [{ key: '0', formula: '2d6' }] },
  },
  ['concentrate', 'fire', 'manipulate'],
);

const heal = spell('heal', {
  traditions: ['divine', 'primal'],
  time: { type: 'actions', cost: 'one', upTo: 'three' },
  range: { type: 'feet', feet: 30 },
  targets: { any: [{ count: 1, of: 'creature' }] },
  damage: [{ key: '0', formula: '1d8', damageType: 'vitality', kinds: ['damage', 'healing'] }],
});

const heroism = spell('heroism', {
  rank: 3,
  traditions: ['divine', 'occult'],
  range: { type: 'touch' },
  targets: { any: [{ count: 1, of: 'creature' }] },
  duration: { type: 'time', count: 10, unit: 'minute' },
});

const bless = spell('bless', {
  traditions: ['divine', 'occult'],
  area: { shape: 'emanation', size: 15 },
  targets: { any: [{ count: 5, upTo: true, of: 'ally' }], includesYou: true },
  duration: { type: 'time', count: 1, unit: 'minute', sustained: true },
});

const rayOfFrost = spell(
  'ray-of-frost',
  {
    range: { type: 'feet', feet: 120 },
    targets: { any: [{ count: 1, of: 'creature' }] },
    damage: [{ key: '0', formula: '2d4', damageType: 'cold', kinds: ['damage'] }],
  },
  ['attack', 'cantrip', 'cold'],
);

const teleport = spell('teleport', {
  rank: 6,
  time: { type: 'time', count: 10, unit: 'minute' },
  range: { type: 'planetary' },
  duration: { type: 'until', until: 'daily-preparations' },
});

describe('spell facets', () => {
  test('Fireball', () => {
    expect(valuesOf(fireball)).toStrictEqual({
      rank: ['3'],
      tradition: ['arcane', 'primal'],
      'cast-actions': ['two'],
      range: ['long'],
      area: ['burst'],
      targets: ['none'],
      defense: ['reflex'],
      duration: ['instant'],
      sustained: ['no'],
      'damage-type': ['fire'],
      heightens: ['yes'],
    });
  });

  test('a variable casting time gives every action count in between', () => {
    expect(valuesOf(heal)['cast-actions']).toStrictEqual(['one', 'two', 'three']);
    expect(valuesOf(teleport)['cast-actions']).toStrictEqual(['time']);
  });

  test('ranges fall into bands, a band holding its top value', () => {
    expect([heal, rayOfFrost, heroism, teleport, bless].map((each) => valuesOf(each)['range'])).toStrictEqual([
      ['30-feet'],
      ['120-feet'],
      ['touch'],
      ['planetary'],
      ['none'],
    ]);
  });

  test('targets: one, several allies with the caster, or none', () => {
    expect(valuesOf(heroism)['targets']).toStrictEqual(['single']);
    expect(valuesOf(bless)['targets']).toStrictEqual(['self', 'multiple', 'allies']);
  });

  test('an attack trait is the attack defence; no defence is none', () => {
    expect(valuesOf(rayOfFrost)['defense']).toStrictEqual(['attack']);
    expect(valuesOf(heroism)['defense']).toStrictEqual(['none']);
  });

  test('durations by unit, sustained as its own flag', () => {
    expect([heroism, bless, teleport].map((each) => valuesOf(each)['duration'])).toStrictEqual([
      ['minute'],
      ['minute'],
      ['until'],
    ]);
    expect(valuesOf(bless)['sustained']).toStrictEqual(['yes']);
  });

  test('entries of other kinds give no spell values', () => {
    const trait = ContentEntry.parse({
      ...structuredClone(fireball),
      kind: 'trait',
      data: { appliesTo: [] },
    });
    expect(Object.values(valuesOf(trait)).flat()).toStrictEqual([]);
  });
});
