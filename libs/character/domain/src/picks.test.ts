import { describe, expect, test } from 'bun:test';

import { PickIndex, Seed, seededPicks } from './pick-source';
import type { PickSource } from './pick-source';
import { PickRefusal, PickWeight, pickOne, pickWeighted, shuffle } from './picks';
import type { PickOutcome, Weighted } from './picks';
import { scriptedPicks } from './testing';

function at(...indices: readonly number[]): PickSource {
  return scriptedPicks(indices.map((index) => PickIndex.parse(index)));
}

function weigh(item: string, weight: number): Weighted<string> {
  return { item, weight: PickWeight.parse(weight) };
}

const EMPTY: PickOutcome<string> = { ok: false, refusal: PickRefusal.Empty };

function found(picked: string): PickOutcome<string> {
  return { ok: true, picked };
}

describe('pickOne', () => {
  test('takes the item at the scripted index', () => {
    expect(pickOne(at(2), ['a', 'b', 'c'])).toEqual(found('c'));
  });

  test('refuses an empty list', () => {
    expect(pickOne(at(0), [])).toEqual(EMPTY);
  });
});

describe('pickWeighted', () => {
  const entries = [weigh('a', 1), weigh('b', 0), weigh('c', 3)];

  test('maps tickets to entries by weight, skipping zero weights', () => {
    const picks = [0, 1, 2, 3].map((ticket) => pickWeighted(at(ticket), entries));
    expect(picks).toEqual(['a', 'c', 'c', 'c'].map((picked) => found(picked)));
  });

  test('refuses no entries and all-zero weights', () => {
    expect(pickWeighted(at(0), [])).toEqual(EMPTY);
    expect(pickWeighted(at(0), [weigh('a', 0)])).toEqual(EMPTY);
  });
});

describe('shuffle', () => {
  test('keeps every item and does not touch the input', () => {
    const items = ['a', 'b', 'c', 'd'];
    const shuffled = shuffle(seededPicks(Seed.parse(7)), items);
    expect(shuffled.toSorted()).toEqual(items);
    expect(items).toEqual(['a', 'b', 'c', 'd']);
  });

  test('shuffles an empty list to an empty list', () => {
    expect(shuffle(at(0), [])).toEqual([]);
  });
});
