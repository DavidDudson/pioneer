import { Rarity } from './entry-fields';
import { CommonFacet, FacetValue, RangeBound } from './facet';
import { SelectionKind } from './facet-filter';
import type { FilterState } from './facet-filter';
import type { Level } from './units';

const UNIQUE = FacetValue.parse(Rarity.Unique);
const ARTIFACT = FacetValue.parse('artifact');

/**
 * The shop's **Available to you** preset (character-model.md, "Shop") for a character of `level`: items of that
 * level or lower, unique items and `artifact` items hidden. Uncommon and rare items stay, shown with their badge.
 * It is a starting point (content-model.md, "Filters"): the filter state a list opens with, every facet of which the
 * player can then change.
 */
export function availableItems(level: Level): FilterState {
  return new Map([
    [
      CommonFacet.Level,
      {
        kind: SelectionKind.Range,
        min: undefined,
        max: RangeBound.parse(level),
      },
    ],
    [CommonFacet.Rarity, { kind: SelectionKind.Values, include: [], exclude: [UNIQUE] }],
    [CommonFacet.Traits, { kind: SelectionKind.Values, include: [], exclude: [ARTIFACT] }],
  ]);
}
