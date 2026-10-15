import { ContentKind } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import type { BrowseKind } from './browse-kinds';
import { BROWSE_KINDS, DEFAULT_KINDS, facetsOf, isBrowseKind, kindsFromQuery, kindsToQuery } from './browse-kinds';

const ids = (kinds: readonly BrowseKind[]): string[] => facetsOf(kinds).map((facet) => facet.id);

describe(kindsFromQuery, () => {
  it('reads the kinds a link names, in browser order, and drops unknown ones', () => {
    expect(kindsFromQuery('weapon,feat,nonsense')).toStrictEqual([ContentKind.Feat, ContentKind.Weapon]);
  });

  it('takes the first value when the param repeats', () => {
    expect(kindsFromQuery(['spell', 'feat'])).toStrictEqual([ContentKind.Spell]);
  });

  it('falls back to the default when the link names none', () => {
    expect(kindsFromQuery(undefined)).toStrictEqual(DEFAULT_KINDS);
    expect(kindsFromQuery('nonsense')).toStrictEqual(DEFAULT_KINDS);
  });

  it('round-trips through kindsToQuery', () => {
    expect(kindsFromQuery(kindsToQuery([ContentKind.Weapon, ContentKind.Spell]))).toStrictEqual([
      ContentKind.Spell,
      ContentKind.Weapon,
    ]);
  });
});

describe(facetsOf, () => {
  it('hides a facet that reads only some kinds unless the list holds one of them', () => {
    expect(ids([ContentKind.Equipment])).not.toContain('weapon-group');
    expect(ids([ContentKind.Armor])).not.toContain('weapon-group');
    expect(ids([ContentKind.Weapon])).toContain('weapon-group');
    expect(ids([ContentKind.Equipment, ContentKind.Weapon])).toContain('weapon-group');
  });

  it('gives every kind the common facets', () => {
    for (const kind of BROWSE_KINDS) {
      expect(ids([kind])).toStrictEqual(expect.arrayContaining(['level', 'rarity', 'traits']));
    }
  });
});

describe(isBrowseKind, () => {
  it('is true for the kinds the browser lists and false for the rest', () => {
    expect(isBrowseKind(ContentKind.Spell)).toBe(true);
    expect(isBrowseKind(ContentKind.Trait)).toBe(false);
  });
});
