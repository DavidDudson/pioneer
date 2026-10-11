import { INVENTORY_KINDS } from '@pioneer/character/domain';
import type { ItemContent, ItemEntry } from '@pioneer/character/domain';
import { facetCounts, facetsFor, filterEntries } from '@pioneer/rules/sdk';
import type { ContentEntry, FacetCounts, FacetDefinition, FilterState } from '@pioneer/rules/sdk';
import type { ShopOffer } from '@pioneer/rules/ui';

/** The facets the shop filters by: the common ones and the equipment kinds'. */
export const SHOP_FACETS: readonly FacetDefinition[] = facetsFor(INVENTORY_KINDS);

/** What the player has asked the shop for. */
export interface ShopQuery {
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
 * The shop's list (character-model.md, "Shop"): the name search, then the filters in force (Available to you, or the
 * player's). Counts are over the search, so each says what picking it would leave.
 */
export function shopList(
  content: ItemContent,
  { search, state }: ShopQuery,
  compare: (left: string, right: string) => number,
): ShopList {
  const entries = [...content.values()];
  const needle = search.trim().toLocaleLowerCase();
  const searched = entries.filter((entry) => entry.name.toLocaleLowerCase().includes(needle));
  return {
    counts: facetCounts(searched, SHOP_FACETS, state),
    offers: kept(searched, state)
      .toSorted((left, right) => compare(left.name, right.name))
      .map((entry) => offerOf(entry)),
  };
}
