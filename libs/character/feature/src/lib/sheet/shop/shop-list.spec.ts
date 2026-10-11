import type { ItemContent, ItemEntry } from '@pioneer/character/domain';
import {
  availableItems,
  CommonFacet,
  ContentEntry,
  ContentKind,
  contentId,
  EntrySlug,
  FacetValue,
  Level,
  PackId,
  RangeBound,
  SelectionKind,
} from '@pioneer/rules/sdk';
import type { FilterState } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import { shopList } from './shop-list';
import type { ShopQuery } from './shop-list';

const PACK = 'player-core';

interface GearFields {
  readonly name: string;
  readonly level: number;
  readonly rarity?: string;
  readonly traits?: readonly string[];
}

/** A Player Core piece of gear with its level, rarity and traits. */
function gear({ name, level, rarity = 'common', traits = [] }: GearFields): ItemEntry {
  const slug = `equipment:${name.toLowerCase().replaceAll(' ', '-')}`;
  const entry = ContentEntry.parse({
    id: contentId(PackId.parse(PACK), EntrySlug.parse(slug)),
    slug,
    pack: PACK,
    kind: ContentKind.Equipment,
    name,
    level,
    rarity,
    traits,
    sources: [{ kind: 'book', book: 'player-core', page: 1 }],
    description: [{ type: 'paragraph', content: [{ type: 'text', text: name }] }],
    rules: [],
    data: { bulk: 'light', price: { coins: { gp: level + 1 } } },
  });
  if (entry.kind !== ContentKind.Equipment) {
    throw new TypeError('Expected equipment');
  }
  return entry;
}

const content: ItemContent = new Map(
  [
    gear({ name: 'Rope', level: 0 }),
    gear({ name: 'Lantern', level: 1, rarity: 'uncommon' }),
    gear({ name: 'Wayfinder', level: 2, rarity: 'rare', traits: ['magical'] }),
    gear({ name: 'Crown', level: 1, rarity: 'unique' }),
    gear({ name: 'Orb', level: 0, traits: ['artifact'] }),
    gear({ name: 'Boots', level: 5, traits: ['magical'] }),
  ].map((entry) => [entry.id, entry]),
);

const byName = (left: string, right: string): number => left.localeCompare(right);
const AVAILABLE = availableItems(Level.parse(2));
const QUERY: ShopQuery = { search: '', state: AVAILABLE };

const names = (query: Partial<ShopQuery> = {}): readonly string[] =>
  shopList(content, { ...QUERY, ...query }, byName).offers.map((offer) => offer.name);

describe(shopList, () => {
  it('on Available to you: up to the character’s level, uncommon and rare kept, unique and artifacts hidden', () => {
    expect(names()).toStrictEqual(['Lantern', 'Rope', 'Wayfinder']);
  });

  it('shows every item with no filters', () => {
    expect(names({ state: new Map() })).toStrictEqual(['Boots', 'Crown', 'Lantern', 'Orb', 'Rope', 'Wayfinder']);
  });

  it('lets the player change a facet of the preset and keep the rest', () => {
    const higher: FilterState = new Map([
      ...AVAILABLE,
      [CommonFacet.Level, { kind: SelectionKind.Range, min: undefined, max: RangeBound.parse(5) }],
    ]);
    expect(names({ state: higher })).toStrictEqual(['Boots', 'Lantern', 'Rope', 'Wayfinder']);
  });

  it('narrows by name, ignoring case, and by the player’s filters', () => {
    expect(names({ search: 'ROP' })).toStrictEqual(['Rope']);
    const magical: FilterState = new Map([
      [CommonFacet.Traits, { kind: SelectionKind.Values, include: [FacetValue.parse('magical')], exclude: [] }],
    ]);
    expect(names({ state: magical })).toStrictEqual(['Boots', 'Wayfinder']);
  });

  it('counts each value over what the other facets and the search leave, an excluded one at 0 so it can be picked', () => {
    const rarity = shopList(content, QUERY, byName).counts.find(({ facet }) => facet.id === CommonFacet.Rarity);
    expect(rarity?.values.map(({ value, count }) => [value, count])).toStrictEqual([
      ['common', 1],
      ['rare', 1],
      ['uncommon', 1],
      ['unique', 0],
    ]);
  });

  it('offers each item with its level, rarity and price', () => {
    const [lantern] = shopList(content, { ...QUERY, search: 'lantern' }, byName).offers;
    expect(lantern).toMatchObject({ name: 'Lantern', level: 1, rarity: 'uncommon', price: { coins: { gp: 2 } } });
  });
});
