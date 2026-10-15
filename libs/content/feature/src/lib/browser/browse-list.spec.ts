import { ContentKind, ContentRegistry, FacetId, FacetValue, SelectionKind } from '@pioneer/rules/sdk';
import type { FilterState } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import { BROWSE_PACK } from '../testing/browse-fixtures';
import { facetsOf } from './browse-kinds';
import type { BrowseKind } from './browse-kinds';
import { browseList, entriesOf } from './browse-list';

const registry = new ContentRegistry();
registry.register(BROWSE_PACK);

const compare = (left: string, right: string): number => left.localeCompare(right);
const names = (kinds: readonly BrowseKind[]): string[] => entriesOf(registry, kinds).map((entry) => entry.name);

describe(entriesOf, () => {
  it('lists the entries of the kinds asked for only', () => {
    expect(names([ContentKind.Spell]).toSorted()).toStrictEqual(['Fireball', 'Heal']);
    expect(entriesOf(registry, [ContentKind.Feat])).toHaveLength(4);
    expect(entriesOf(registry, [ContentKind.Feat, ContentKind.Spell])).toHaveLength(6);
  });
});

describe(browseList, () => {
  const kinds = [ContentKind.Feat] as const;
  const entries = entriesOf(registry, kinds);
  const facets = facetsOf(kinds);
  const traits = FacetId.parse('traits');
  const fighter = FacetValue.parse('fighter');

  it('keeps every entry, by name, when nothing is picked', () => {
    const { entries: kept } = browseList({ entries, facets, state: new Map() }, compare);
    expect(kept.map((entry) => entry.name)).toStrictEqual(kept.map((entry) => entry.name).toSorted(compare));
    expect(kept).toHaveLength(4);
  });

  it('narrows by a picked value and counts what each value would leave', () => {
    const state: FilterState = new Map([[traits, { kind: SelectionKind.Values, include: [fighter], exclude: [] }]]);
    const { entries: kept, counts } = browseList({ entries, facets, state }, compare);
    expect(kept).toHaveLength(2);
    const general = counts.find((each) => each.facet.id === traits)?.values.find((each) => each.value === 'general');
    expect(general?.count).toBe(3);
  });

  it('drops entries with an excluded value', () => {
    const state: FilterState = new Map([[traits, { kind: SelectionKind.Values, include: [], exclude: [fighter] }]]);
    expect(browseList({ entries, facets, state }, compare).entries).toHaveLength(2);
  });
});
