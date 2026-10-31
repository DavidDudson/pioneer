import { facetsFor, SlotKey } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import {
  slotEverythingFromQuery,
  slotEverythingToQuery,
  slotFilterFromQuery,
  slotFilterToQuery,
} from './sheet-feat-filter';

const FACETS = facetsFor(['feat']);
const ONE = SlotKey.parse('class-feat:1');
const TWO = SlotKey.parse('class-feat:2');

describe('slot filters in the URL', () => {
  it('reads only the filters of its own slot', () => {
    const params = { 'f.class-feat:1.traits': 'fighter', 'f.class-feat:2.traits': 'wizard', 'f.traits': 'rogue' };

    expect(slotFilterToQuery(slotFilterFromQuery(params, ONE, FACETS), ONE, FACETS)['f.class-feat:1.traits']).toBe(
      'fighter',
    );
    expect(slotFilterFromQuery(params, TWO, FACETS).size).toBe(1);
    expect(slotFilterFromQuery({ 'f.traits': 'rogue' }, ONE, FACETS).size).toBe(0);
  });

  it('writes a param for every facet, clearing the ones the state drops', () => {
    const query = slotFilterToQuery(new Map(), ONE, FACETS);

    expect(Object.keys(query)).toStrictEqual(FACETS.map((facet) => `f.class-feat:1.${facet.id}`));
    expect(Object.values(query).every((value) => value === undefined)).toBe(true);
  });

  it('round-trips a state', () => {
    const state = slotFilterFromQuery({ 'f.class-feat:1.level': '..3' }, ONE, FACETS);
    const query = slotFilterToQuery(state, ONE, FACETS);

    expect(query['f.class-feat:1.level']).toBe('..3');
    expect(slotFilterFromQuery(query, ONE, FACETS)).toStrictEqual(state);
  });

  it('keeps the ask to show everything per slot', () => {
    const query = slotEverythingToQuery(ONE, true);

    expect(slotEverythingFromQuery(query, ONE)).toBe(true);
    expect(slotEverythingFromQuery(query, TWO)).toBe(false);
    expect(slotEverythingFromQuery(slotEverythingToQuery(ONE, false), ONE)).toBe(false);
  });
});
