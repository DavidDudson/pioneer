import { describe, expect, it } from 'vitest';

import { ContentBrowserTier } from './browser-state';
import { tierRegions } from './tier-regions';

describe(tierRegions, () => {
  it('shows the preview tier as the entry alone', () => {
    expect(tierRegions(ContentBrowserTier.Preview)).toStrictEqual({
      search: false,
      facets: false,
      list: false,
      table: false,
      entry: true,
    });
  });

  it('gives the panel tier the search, the filter bar and a compact list that opens an entry', () => {
    expect(tierRegions(ContentBrowserTier.Panel)).toStrictEqual({
      search: true,
      facets: false,
      list: true,
      table: false,
      entry: true,
    });
  });

  it('gives the page tier the facet panel and the table, and leaves the entry to its own route', () => {
    expect(tierRegions(ContentBrowserTier.Page)).toStrictEqual({
      search: true,
      facets: true,
      list: true,
      table: true,
      entry: false,
    });
  });
});
