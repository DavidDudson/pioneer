import { describe, expect, test } from 'bun:test';

import { ContentEntry } from './content-entry';
import { contentId, PackId, Slug } from './content-id';
import { EQUIPMENT_FACETS } from './equipment-facets';
import { facetValues, UNKNOWN } from './facet';
import type { FacetDefinition } from './facet';
import { facetCounts, filterEntries } from './facet-filter';
import { filterFromQuery } from './filter-query';
import type { RegisteredKind } from './kind-data';
import { facetsFor } from './kind-facets';

const PACK = 'player-core';
const prose = [{ type: 'paragraph', content: [{ type: 'text', text: 'An item.' }] }];
const idOf = (slug: string): string => contentId(PackId.parse(PACK), Slug.parse(slug));

interface ItemFields {
  readonly kind: string;
  readonly slug: string;
  readonly data: object;
  readonly traits?: readonly string[];
}

/** A Player Core item at level 0; a kit has no level. */
function item({ traits = [], ...fields }: ItemFields): ContentEntry {
  return ContentEntry.parse({
    id: idOf(fields.slug),
    pack: PACK,
    name: fields.slug,
    rarity: 'common',
    traits,
    sources: [{ kind: 'book', book: 'player-core', page: 1 }],
    description: prose,
    rules: [],
    ...(fields.kind === 'kit' ? {} : { level: 0 }),
    ...fields,
  });
}

const longsword = item({
  kind: 'weapon',
  slug: 'longsword',
  traits: ['versatile-p'],
  data: {
    price: { coins: { gp: 1 } },
    bulk: 1,
    category: 'martial',
    group: 'sword',
    damage: { dice: 1, die: 'd8', damageType: 'slashing' },
    usage: { type: 'held', hands: 'one' },
  },
});
const alchemistsFire = item({
  kind: 'weapon',
  slug: 'alchemists-fire',
  traits: ['alchemical', 'bomb', 'consumable', 'fire', 'splash'],
  data: {
    price: { coins: { gp: 3 } },
    bulk: 'light',
    category: 'martial',
    group: 'bomb',
    damage: {
      dice: 1,
      die: 'd8',
      damageType: 'fire',
      persistent: { formula: '1', damageType: 'fire' },
    },
    usage: { type: 'held', hands: 'one' },
  },
});
const leatherArmor = item({
  kind: 'armor',
  slug: 'leather-armor',
  data: { price: { coins: { gp: 2 } }, bulk: 1, category: 'light', group: 'leather', acBonus: 1 },
});
const steelShield = item({
  kind: 'shield',
  slug: 'steel-shield',
  data: { price: { coins: { gp: 2 } }, bulk: 1, acBonus: 2, hardness: 5, hitPoints: 20 },
});
const backpack = item({
  kind: 'equipment',
  slug: 'backpack',
  data: { price: { coins: { sp: 1 } }, bulk: 'negligible', usage: { type: 'worn', slot: 'backpack' } },
});
const healingPotion = item({
  kind: 'consumable',
  slug: 'minor-healing-potion',
  traits: ['consumable', 'healing', 'magical', 'potion'],
  data: { price: { coins: { gp: 4 } }, bulk: 'light', category: 'potion', usage: { type: 'held', hands: 'one' } },
});
const arrows = item({
  kind: 'consumable',
  slug: 'arrows',
  data: { price: { coins: { sp: 1 }, per: 10 }, bulk: 'light', bulkPer: 10, category: 'ammunition' },
});
const striking = item({
  kind: 'rune',
  slug: 'striking',
  traits: ['magical'],
  data: {
    price: { coins: { gp: 65 } },
    bulk: 'negligible',
    type: 'fundamental',
    rune: 'striking',
    grade: 1,
    etchedOnto: { item: 'weapon' },
  },
});
const diamond = item({
  kind: 'treasure',
  slug: 'diamond',
  data: { price: { coins: { pp: 1, gp: 5 } }, bulk: 'negligible', category: 'gem' },
});
const adventurersPack = item({
  kind: 'kit',
  slug: 'adventurers-pack',
  data: { price: { coins: { sp: 15 } }, items: [{ item: idOf('backpack'), quantity: 1 }] },
});
const fireball = ContentEntry.parse({
  id: idOf('fireball'),
  slug: 'fireball',
  pack: PACK,
  kind: 'spell',
  name: 'Fireball',
  level: 3,
  rarity: 'common',
  traits: ['concentrate', 'fire', 'manipulate'],
  sources: [{ kind: 'book', book: 'player-core', page: 1 }],
  description: prose,
  rules: [],
  data: {
    rank: 3,
    traditions: ['arcane', 'primal'],
    time: { type: 'actions', cost: 'two' },
    damage: [{ key: '0', formula: '6d6', damageType: 'fire', kinds: ['damage'] }],
  },
});

const ITEMS = [
  longsword,
  alchemistsFire,
  leatherArmor,
  steelShield,
  backpack,
  healingPotion,
  arrows,
  striking,
  diamond,
  adventurersPack,
];

/** Every equipment facet's values for `subject`, keyed by facet id. */
function valuesOf(subject: ContentEntry): Record<string, readonly string[]> {
  return Object.fromEntries(EQUIPMENT_FACETS.map((facet: FacetDefinition) => [facet.id, facetValues(subject, facet)]));
}

/** The values `subject` gives the equipment facet `id`. */
function valueOf(subject: ContentEntry, id: string): readonly string[] {
  const facet = EQUIPMENT_FACETS.find((each) => each.id === id);
  return facet === undefined ? [] : facetValues(subject, facet);
}

/** The ids of the facets a list of one kind gets. */
const facetIds = (kind: RegisteredKind): readonly string[] => facetsFor([kind]).map((facet) => facet.id);

const slugs = (entries: readonly ContentEntry[]): readonly string[] => entries.map((each) => each.slug);

function filter(entries: readonly ContentEntry[], query: Record<string, string>): readonly string[] {
  const facets = facetsFor([...new Set(entries.map((each) => each.kind))]);
  return slugs(filterEntries(entries, facets, filterFromQuery(query, facets)));
}

/** The items of `ITEMS` a filter left out. */
const dropped = (kept: readonly string[]): readonly string[] => slugs(ITEMS).filter((slug) => !kept.includes(slug));

describe('equipment facet values', () => {
  test('a weapon gives every facet, its persistent damage among its damage types', () => {
    expect(valuesOf(alchemistsFire)).toEqual({
      'item-kind': ['weapon'],
      price: ['300'],
      bulk: ['1'],
      usage: ['held'],
      consumable: ['yes'],
      magical: ['no'],
      'weapon-group': ['bomb'],
      'damage-type': ['fire'],
      'armor-category': [],
    });
  });

  test('armour is worn and has a category, but no weapon group or damage type', () => {
    const facets = { 'item-kind': ['armor'], 'weapon-group': [], 'damage-type': [], 'armor-category': ['light'] };
    expect(valuesOf(leatherArmor)).toMatchObject(facets);
  });

  test('magical comes from the magical or a tradition trait, consumable from the kind or the trait', () => {
    const holyWater = item({
      kind: 'consumable',
      slug: 'holy-water',
      traits: ['consumable', 'divine', 'holy', 'splash'],
      data: { bulk: 'light', category: 'other' },
    });
    expect(valuesOf(healingPotion)).toMatchObject({ consumable: ['yes'], magical: ['yes'] });
    expect(valuesOf(striking)).toMatchObject({ consumable: ['no'], magical: ['yes'] });
    expect(valuesOf(alchemistsFire)).toMatchObject({ consumable: ['yes'], magical: ['no'] });
    expect(valuesOf(holyWater)).toMatchObject({ consumable: ['yes'], magical: ['yes'] });
  });

  test('a weapon that deals no damage gives no damage type but its persistent one', () => {
    const glue = { dice: 0, damageType: 'bludgeoning' };
    const glueBomb = item({ kind: 'weapon', slug: 'glue-bomb', data: { ...longsword.data, damage: glue } });
    const sticky = { ...glue, persistent: { formula: '1', damageType: 'acid' } };
    const stickyBomb = item({ kind: 'weapon', slug: 'sticky-bomb', data: { ...longsword.data, damage: sticky } });
    expect([valueOf(glueBomb, 'damage-type'), valueOf(stickyBomb, 'damage-type')]).toEqual([[], ['acid']]);
  });

  test('a price adds its coins in copper; a batch compares at its printed price; no price is unknown', () => {
    const unpriced = item({ kind: 'treasure', slug: 'old-coin', data: { bulk: 'negligible' } });
    const prices = [diamond, arrows, adventurersPack, unpriced].map((each) => valueOf(each, 'price'));
    expect(prices).toEqual([['1500'], ['10'], ['150'], [UNKNOWN]]);
    expect(filter([diamond, unpriced], { 'f.price': '..2000' })).toEqual(['diamond']);
  });

  test('bulk counts tenths: negligible is 0, light 1, 1 Bulk 10', () => {
    expect(valueOf(backpack, 'bulk')).toEqual(['0']);
    expect(valueOf(arrows, 'bulk')).toEqual(['1']);
    expect(valueOf(longsword, 'bulk')).toEqual(['10']);
  });

  test('usage is fixed for armour, shields and runes, unknown when an item leaves it out, none for treasure', () => {
    const usages = [leatherArmor, steelShield, striking, arrows, diamond].map((each) => valueOf(each, 'usage'));
    expect(usages).toEqual([['worn'], ['held'], ['etched'], [UNKNOWN], []]);
  });

  test('a kit has no Bulk of its own and is not used', () => {
    expect(valuesOf(adventurersPack)).toMatchObject({ bulk: [UNKNOWN], usage: [] });
  });

  test('a weapon without a group is unknown', () => {
    const fist = item({ kind: 'weapon', slug: 'improvised', data: { ...longsword.data, group: undefined } });
    expect(valueOf(fist, 'weapon-group')).toEqual([UNKNOWN]);
  });

  test('entries of other kinds give the item facets no value, and spells keep their damage types', () => {
    expect(valuesOf(fireball)).toMatchObject({ 'item-kind': [], price: [], bulk: [], 'damage-type': ['fire'] });
  });
});

describe('filtering equipment', () => {
  test('every equipment kind gets the one shared facet set', () => {
    const weapon = facetIds('weapon');
    for (const kind of ['armor', 'shield', 'equipment', 'consumable', 'rune', 'treasure', 'kit'] as const) {
      expect(facetIds(kind)).toEqual(weapon);
    }
    expect(weapon).toContain('weapon-group');
    expect(weapon).toContain('armor-category');
  });

  test('weapon group and armour category say which kinds they apply to', () => {
    const appliesTo = new Map(EQUIPMENT_FACETS.map((facet) => [String(facet.id), facet.appliesTo]));
    expect(appliesTo.get('weapon-group')).toEqual(['weapon']);
    expect(appliesTo.get('armor-category')).toEqual(['armor']);
    expect(appliesTo.get('damage-type')).toEqual(['spell', 'weapon']);
    expect(appliesTo.get('price')).toBeUndefined();
  });

  test('a price range keeps items between the bounds, in copper', () => {
    const kept = filter(ITEMS, { 'f.price': '..200' });
    expect(dropped(kept)).toEqual(['alchemists-fire', 'minor-healing-potion', 'striking', 'diamond']);
  });

  test('a bulk range of up to light keeps negligible and light items, not a kit', () => {
    const kept = filter(ITEMS, { 'f.bulk': '..1' });
    expect(dropped(kept)).toEqual(['longsword', 'leather-armor', 'steel-shield', 'adventurers-pack']);
  });

  test('picking a weapon group keeps only weapons of it', () => {
    expect(filter(ITEMS, { 'f.weapon-group': 'sword' })).toEqual(['longsword']);
  });

  test('magical and not consumable', () => {
    expect(filter(ITEMS, { 'f.magical': 'yes', 'f.consumable': 'no' })).toEqual(['striking']);
    expect(filter(ITEMS, { 'f.consumable': 'yes' })).toEqual(['alchemists-fire', 'minor-healing-potion', 'arrows']);
  });

  test('damage type filters spells and weapons together', () => {
    expect(filter([...ITEMS, fireball], { 'f.damage-type': 'fire' })).toEqual(['alchemists-fire', 'fireball']);
  });

  test('item kind counts every kind in the list', () => {
    const facets = facetsFor([...new Set(ITEMS.map((each) => each.kind))]);
    const kinds = facetCounts(ITEMS, facets, new Map()).find((counts) => counts.facet.id === 'item-kind');
    const count = (value: string): number | undefined => kinds?.values.find((row) => row.value === value)?.count;
    expect([count('weapon'), count('consumable'), count('kit')]).toEqual([2, 2, 1]);
  });
});
