import { signal } from '@angular/core';
import { FilterKind } from '@pioneer/frontier';
import type { AsyncQuery, FilterField } from '@pioneer/frontier';
import {
  ContentKind,
  ContentLicense,
  ContentText,
  facetCounts,
  facetsFor,
  RichText,
  slugName,
  SourceRef,
} from '@pioneer/rules/sdk';
import type { FacetCounts, FilterState } from '@pioneer/rules/sdk';
import { ContentPackBuilder } from '@pioneer/rules/sdk/testing';
import type { EntryPreview } from '@pioneer/rules/ui';

import type { BrowseRow } from '../browse-row';
import type { ContentBrowserList } from '../browser-list';
import { EMPTY_BROWSER_STATE } from '../browser-state';
import type { ContentBrowserState, ContentEntryRef } from '../browser-state';

const PACK = new ContentPackBuilder()
  .withId('browser-ui-test')
  .withFeat('shield-block', { level: 1, traits: ['fighter', 'general'] })
  .withFeat('power-attack', { level: 1, traits: ['fighter', 'flourish'] })
  .withFeat('toughness', { level: 1, traits: ['general'] })
  .build();

const FEAT_LABEL = 'Feat';
const BOOK = SourceRef.parse({ kind: 'book', book: 'player-core', page: 1 });

/** The feats' rows as the table shows them. */
export const BROWSER_ROWS: readonly BrowseRow[] = PACK.otherEntries.map((entry) => {
  const name = slugName(entry.slug);
  return {
    id: entry.id,
    entry: entry.id,
    name: entry.name,
    to: ['/content', ContentKind.Feat, name],
    ref: { kind: ContentKind.Feat, name },
    kind: FEAT_LABEL,
    level: '1',
    levelValue: 1,
    creature: undefined,
    traits: entry.traits.map((trait) => ({ label: trait, tone: 'neutral' as const })),
    sources: [{ source: BOOK, book: undefined, license: ContentLicense.Orc }],
    legacy: false,
  };
});

/** What each filter value would leave of the feats, from the real facets. */
const BROWSER_COUNTS: readonly FacetCounts[] = facetCounts(PACK.otherEntries, facetsFor([ContentKind.Feat]), new Map());

/** The filter bar's one field. */
export const BROWSER_FIELDS: readonly FilterField[] = [
  {
    id: 'trait',
    label: 'Trait',
    kind: FilterKind.Set,
    options: [
      { value: 'fighter', label: 'Fighter', count: 2 },
      { value: 'general', label: 'General', count: 2 },
    ],
  },
];

/** No facet filter picked. */
export const NO_FACETS: FilterState = new Map();

/** The three feats, all of them. */
export const BROWSER_LIST: ContentBrowserList = {
  rows: BROWSER_ROWS,
  total: BROWSER_ROWS.length,
  counts: BROWSER_COUNTS,
  searching: false,
};

/** An entry's card. */
export const SHIELD_BLOCK_CARD: EntryPreview = {
  name: ContentText.parse('Shield Block'),
  level: undefined,
  traits: ['fighter', 'general'],
  summary: RichText.parse([
    { type: 'paragraph', content: [{ type: 'text', text: 'You snap your shield in place to ward off a blow.' }] },
  ]),
  sources: [BOOK],
};

/** The entry the three tiers share. */
export const SHIELD_BLOCK: ContentEntryRef = { kind: ContentKind.Feat, name: 'shield-block' };

/** A browser listing feats with an entry picked. */
export const PICKED_STATE: ContentBrowserState = {
  ...EMPTY_BROWSER_STATE,
  kinds: [ContentKind.Feat],
  selected: SHIELD_BLOCK,
};

/** A browser listing feats, nothing picked. */
export const LISTING_STATE: ContentBrowserState = { ...EMPTY_BROWSER_STATE, kinds: [ContentKind.Feat] };

/** A query that has loaded `data`. */
export function loaded<TData>(data: TData): AsyncQuery<TData> {
  return { data: signal(data), error: signal(undefined), isPending: () => false, isError: () => false };
}

/** `row` with its legacy flag set. */
function legacyRow(row: BrowseRow, legacy: boolean): BrowseRow {
  return { ...row, legacy };
}

/** The feats again, the first of them from a pre-remaster book. */
export const LEGACY_LIST: ContentBrowserList = {
  ...BROWSER_LIST,
  rows: BROWSER_ROWS.map((row, index) => legacyRow(row, index === 0)),
};
