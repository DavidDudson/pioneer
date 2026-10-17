import { FilterOperator } from '@pioneer/frontier';
import { ContentKind } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import { EMPTY_BROWSER_STATE, sameEntry } from './browser-state';
import type { ContentBrowserState } from './browser-state';

const FULL: ContentBrowserState = {
  kinds: [ContentKind.Feat, ContentKind.Spell],
  query: 'shield',
  filters: [{ field: 'trait', operator: FilterOperator.Is, values: ['fighter'] }],
  selected: { kind: ContentKind.Feat, name: 'shield-block' },
};

describe('A browser state', () => {
  it('survives a JSON round trip, so it can be saved or put in a link', () => {
    const text = JSON.stringify(FULL);
    const copy: unknown = JSON.parse(text);
    expect(copy).toStrictEqual(FULL);
  });

  it('survives a JSON round trip with no entry picked', () => {
    const text = JSON.stringify(EMPTY_BROWSER_STATE);
    const copy: unknown = JSON.parse(text);
    expect(copy).toStrictEqual(EMPTY_BROWSER_STATE);
  });
});

describe(sameEntry, () => {
  it('matches the same kind and name', () => {
    expect(sameEntry(FULL.selected, { kind: ContentKind.Feat, name: 'shield-block' })).toBe(true);
  });

  it('tells apart the same name of another kind', () => {
    expect(sameEntry(FULL.selected, { kind: ContentKind.Spell, name: 'shield-block' })).toBe(false);
  });

  it('matches two entries picked by nobody', () => {
    expect(sameEntry(undefined, undefined)).toBe(true);
  });

  it('tells apart an entry from none', () => {
    expect(sameEntry(FULL.selected, undefined)).toBe(false);
  });
});
