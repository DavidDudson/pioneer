import { ContentBrowserTier } from './browser-state';

/** The regions of the browser a tier shows. The filter bar goes wherever the list does. */
export interface TierRegions {
  /** The search box and the kinds. */
  readonly search: boolean;
  /** The facet panel, the filters with every value and its count. */
  readonly facets: boolean;
  /** The list of entries. */
  readonly list: boolean;
  /** The list as a table with the column chooser, rather than a compact list. */
  readonly table: boolean;
  /** The entry picked. */
  readonly entry: boolean;
}

const REGIONS: Readonly<Record<ContentBrowserTier, TierRegions>> = {
  [ContentBrowserTier.Preview]: { search: false, facets: false, list: false, table: false, entry: true },
  [ContentBrowserTier.Panel]: { search: true, facets: false, list: true, table: false, entry: true },
  [ContentBrowserTier.Page]: { search: true, facets: true, list: true, table: true, entry: false },
};

/** What `tier` shows. The page tier opens an entry on its own route, so it has no entry region. */
export function tierRegions(tier: ContentBrowserTier): TierRegions {
  return REGIONS[tier];
}
