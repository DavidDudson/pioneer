import { EMPTY_BROWSER_STATE } from '@pioneer/content/ui';
import { FilterOperator } from '@pioneer/frontier';
import { ContentKind } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import { facetsOf } from './browse-kinds';
import { kindsToLoad, listedKinds, withKnownFilters } from './browse-state';

describe(listedKinds, () => {
  it('lists the default kind when the state names none', () => {
    expect(listedKinds([])).toStrictEqual([ContentKind.Feat]);
  });

  it('puts the kinds in the browser order', () => {
    expect(listedKinds([ContentKind.Weapon, ContentKind.Spell])).toStrictEqual([ContentKind.Spell, ContentKind.Weapon]);
  });

  it('drops a kind the browser does not list', () => {
    expect(listedKinds([ContentKind.Spell, ContentKind.Condition])).toStrictEqual([ContentKind.Spell]);
  });
});

describe(kindsToLoad, () => {
  it('loads the kinds listed when no entry is picked', () => {
    expect(kindsToLoad({ ...EMPTY_BROWSER_STATE, kinds: [ContentKind.Spell] })).toStrictEqual([ContentKind.Spell]);
  });

  it('loads the conditions a picked entry may mention', () => {
    const state = { ...EMPTY_BROWSER_STATE, selected: { kind: ContentKind.Feat, name: 'shield-block' } };
    expect(kindsToLoad(state)).toContain(ContentKind.Condition);
  });

  it('names a kind once, whether listed or referred to', () => {
    const state = { ...EMPTY_BROWSER_STATE, selected: { kind: ContentKind.Feat, name: 'shield-block' } };
    expect(kindsToLoad(state).filter((kind) => kind === ContentKind.Feat)).toHaveLength(1);
  });
});

describe(withKnownFilters, () => {
  // A facet every kind has.
  const [facet] = facetsOf([ContentKind.Spell]);
  const TRAIT = { field: facet?.id ?? '', operator: FilterOperator.Is, values: ['fire'] };
  const UNKNOWN = { field: 'no-such-facet', operator: FilterOperator.Is, values: ['x'] };

  it('keeps a filter the kinds have', () => {
    const state = { ...EMPTY_BROWSER_STATE, kinds: [ContentKind.Spell], filters: [TRAIT] };
    expect(withKnownFilters(state).filters).toStrictEqual([TRAIT]);
  });

  it('drops a filter no facet of the kinds has', () => {
    const state = { ...EMPTY_BROWSER_STATE, kinds: [ContentKind.Spell], filters: [TRAIT, UNKNOWN] };
    expect(withKnownFilters(state).filters).toStrictEqual([TRAIT]);
  });
});
