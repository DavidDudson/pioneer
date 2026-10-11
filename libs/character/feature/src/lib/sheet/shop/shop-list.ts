import { INVENTORY_KINDS } from '@pioneer/character/domain';
import type { ItemContent, ItemEntry } from '@pioneer/character/domain';
import { availableItems, facetCounts, facetsFor, filterEntries } from '@pioneer/rules/sdk';
import type { ContentEntry, FacetCounts, FacetDefinition, FilterState, Level } from '@pioneer/rules/sdk';
import type { ShopOffer } from '@pioneer/rules/ui';

/** The facets the shop filters by: the common ones and the equipment kinds'. */
export const SHOP_FACETS: readonly FacetDefinition[] = facetsFor(INVENTORY_KINDS);

/** What the player has asked the shop for. */
export interface ShopQuery {
  /** The character's level, for the Available to you preset. */
  readonly level: Level;
  /** Whether the preset is off, so every item shows. */
  readonly everything: boolean;
  /** Text the item's name contains, ignoring case. */
  readonly search: string;
  readonly state: FilterState;
}

/** What the shop shows: each facet's value counts and the items left, by name. */
export interface ShopList {
  readonly counts: readonly FacetCounts[];
  readonly offers: readonly ShopOffer[];
}

function offerOf({ id, name, level, rarity, data }: ItemEntry): ShopOffer {
  return { id, name, level, rarity, price: data.price };
}

/** The entries of `entries` that `state` keeps, as the item entries they are. */
function kept(entries: readonly ItemEntry[], state: FilterState): readonly ItemEntry[] {
  const keep: ReadonlySet<ContentEntry> = new Set(filterEntries(entries, SHOP_FACETS, state));
  return entries.filter((entry) => keep.has(entry));
}

/**
 * The shop's list (character-model.md, "Shop"): the Available to you preset unless `everything`, then the name
 * search, then the player's filters. Counts are over the preset and search, so each says what picking it would leave.
 */
export function shopList(
  content: ItemContent,
  { level, everything, search, state }: ShopQuery,
  compare: (left: string, right: string) => number,
): ShopList {
  const entries = [...content.values()];
  const offered = everything ? entries : kept(entries, availableItems(level));
  const needle = search.trim().toLocaleLowerCase();
  const searched = offered.filter((entry) => entry.name.toLocaleLowerCase().includes(needle));
  return {
    counts: facetCounts(searched, SHOP_FACETS, state),
    offers: kept(searched, state)
      .toSorted((left, right) => compare(left.name, right.name))
      .map((entry) => offerOf(entry)),
  };
}
