import { ContentId, ContentKind, ContentRegistry, FacetId, FacetValue, SelectionKind } from '@pioneer/rules/sdk';
import type { ContentEntry, FilterState } from '@pioneer/rules/sdk';
import { ContentPackBuilder } from '@pioneer/rules/sdk/testing';
import { describe, expect, it } from 'vitest';

import { BROWSE_PACK } from '../testing/browse-fixtures';
import { facetsOf } from './browse-kinds';
import type { BrowseKind } from './browse-kinds';
import { browseList, entriesOf } from './browse-list';
import type { BrowseList } from './browse-list';

const registry = new ContentRegistry();
registry.register(BROWSE_PACK);

const compare = (left: string, right: string): number => left.localeCompare(right);
/** The id of the entry named `name`; the specs only ask for names the fixtures hold. */
function idOf(entries: readonly ContentEntry[], name: string): ContentId {
  const found = entries.find((entry) => entry.name === name);
  if (found === undefined) {
    throw new Error(`Expected an entry named ${name}`);
  }
  return found.id;
}

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
  const found = (...called: readonly string[]): readonly ContentId[] => called.map((name) => idOf(entries, name));
  const countOf = (list: BrowseList, value: string): number | undefined =>
    list.counts.find((each) => each.facet.id === traits)?.values.find((each) => each.value === value)?.count;

  it('keeps every entry, by name, when nothing is picked', () => {
    const { entries: kept } = browseList({ entries, facets, state: new Map() }, compare);
    expect(kept.map((entry) => entry.name)).toStrictEqual(kept.map((entry) => entry.name).toSorted(compare));
    expect(kept).toHaveLength(4);
  });

  it('narrows by a picked value and counts what each value would leave', () => {
    const state: FilterState = new Map([[traits, { kind: SelectionKind.Values, include: [fighter], exclude: [] }]]);
    const list = browseList({ entries, facets, state }, compare);
    expect(list.entries).toHaveLength(2);
    expect(countOf(list, 'general')).toBe(3);
  });

  it('drops entries with an excluded value', () => {
    const state: FilterState = new Map([[traits, { kind: SelectionKind.Values, include: [], exclude: [fighter] }]]);
    expect(browseList({ entries, facets, state }, compare).entries).toHaveLength(2);
  });

  describe('with the ids a search found', () => {
    it('lists only those entries, in the order of the search, not by name', () => {
      const matches = found('Toughness', 'Power-attack');
      const list = browseList({ entries, facets, state: new Map(), matches }, compare);
      expect(list.entries.map((entry) => entry.name)).toStrictEqual(['Toughness', 'Power-attack']);
    });

    it('applies the filters to those entries', () => {
      const matches = found('Toughness', 'Power-attack', 'Shield-block');
      const state: FilterState = new Map([[traits, { kind: SelectionKind.Values, include: [fighter], exclude: [] }]]);
      const list = browseList({ entries, facets, state, matches }, compare);
      expect(list.entries.map((entry) => entry.name)).toStrictEqual(['Power-attack', 'Shield-block']);
    });

    it('counts the values among the matches only', () => {
      const matches = found('Toughness', 'Power-attack', 'Shield-block');
      const list = browseList({ entries, facets, state: new Map(), matches }, compare);
      const all = browseList({ entries, facets, state: new Map() }, compare);
      expect(countOf(all, 'general')).toBe(3);
      expect(countOf(list, 'general')).toBe(2);
    });

    it('skips an id the loaded kinds do not hold, and lists nothing for no matches', () => {
      const stray = ContentId.parse('00000000-0000-5000-8000-000000000000');
      expect(browseList({ entries, facets, state: new Map(), matches: [stray] }, compare).entries).toStrictEqual([]);
      expect(browseList({ entries, facets, state: new Map(), matches: [] }, compare).entries).toStrictEqual([]);
    });
  });
});

describe('creatures', () => {
  const creatureRegistry = new ContentRegistry();
  creatureRegistry.register(
    new ContentPackBuilder()
      .withId('bestiary-test')
      .withCreature({
        slug: 'creature:goblin',
        name: 'Goblin',
        level: -1,
        role: 'monster',
        size: 'small',
        traits: ['goblin', 'humanoid'],
        perception: 2,
        attributes: { str: 0, dex: 3, con: 1, int: 0, wis: 1, cha: 1 },
        armorClass: 16,
        saves: { fortitude: 5, reflex: 7, will: 3 },
        hitPoints: 6,
        immunities: [],
        weaknesses: [],
        resistances: [],
        speed: 25,
      })
      .build(),
  );

  it('are listed with their kind, filtered by role and size', () => {
    const entries = entriesOf(creatureRegistry, [ContentKind.Creature]);
    expect(entries.map((entry) => entry.name)).toStrictEqual(['Goblin']);
    const facets = facetsOf([ContentKind.Creature]);
    expect(facets.map((facet) => facet.id)).toStrictEqual(expect.arrayContaining(['role', 'size']));
  });

  it('are kept or dropped by the role filter', () => {
    const entries = entriesOf(creatureRegistry, [ContentKind.Creature]);
    const facets = facetsOf([ContentKind.Creature]);
    const role = FacetId.parse('role');
    const picked = (value: string): FilterState =>
      new Map([[role, { kind: SelectionKind.Values, include: [FacetValue.parse(value)], exclude: [] }]]);
    expect(browseList({ entries, facets, state: picked('monster') }, compare).entries).toHaveLength(1);
    expect(browseList({ entries, facets, state: picked('npc') }, compare).entries).toHaveLength(0);
  });
});
