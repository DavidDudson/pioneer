import { CommonFacet, ContentKind, EntryCount, FacetId, FacetValue, facetsFor } from '@pioneer/rules/sdk';
import type { FacetCounts, FacetDefinition, ValueCount } from '@pioneer/rules/sdk';

const FACETS = facetsFor([ContentKind.Weapon, ContentKind.Armor]);

function facet(id: FacetId): FacetDefinition {
  const found = FACETS.find((each) => each.id === id);
  if (found === undefined) {
    throw new Error(`No facet ${id}`);
  }
  return found;
}

function counts(id: FacetId, values: Readonly<Record<string, number>>): FacetCounts {
  const rows: ValueCount[] = Object.entries(values).map(([value, count]) => ({
    value: FacetValue.parse(value),
    count: EntryCount.parse(count),
  }));
  return { facet: facet(id), values: rows, unknown: EntryCount.parse(0) };
}

export const LEVEL_FACET = facet(CommonFacet.Level);
export const RARITY_FACET = facet(CommonFacet.Rarity);
export const TRAITS_FACET = facet(CommonFacet.Traits);
const ITEM_KIND = FacetId.parse('item-kind');
const MAGICAL = FacetId.parse('magical');
const WEAPON_GROUP = FacetId.parse('weapon-group');

/** A shop's weapons and armour: levels 0 to 3, mostly common, a few magical, all from Player Core. */
export const SHOP_FACET_COUNTS: readonly FacetCounts[] = [
  counts(CommonFacet.Level, { '0': 14, '1': 6, '2': 3, '3': 1 }),
  counts(CommonFacet.Rarity, { common: 21, uncommon: 2, rare: 1 }),
  counts(CommonFacet.Traits, { magical: 4, 'versatile-p': 3, agile: 2 }),
  counts(CommonFacet.Book, { 'player-core': 24 }),
  counts(CommonFacet.Pack, {}),
  counts(ITEM_KIND, { weapon: 16, armor: 8 }),
  counts(MAGICAL, { no: 20, yes: 4 }),
  counts(WEAPON_GROUP, { sword: 5, axe: 4 }),
];
