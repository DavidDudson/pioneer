import { describe, test } from 'bun:test';

import { array, assert, integer, nat, property } from 'fast-check';

import { PickBound, Seed, seededPicks } from './pick-source';
import { pickOne, PickWeight, pickWeighted, shuffle } from './picks';

const SEED_MAX = 2_147_483_647;
const seeds = integer({ min: 0, max: SEED_MAX }).map((value) => Seed.parse(value));
const BOUND_MAX = 1000;
const bounds = integer({ min: 1, max: BOUND_MAX }).map((value) => PickBound.parse(value));
const LIST_MAX = 30;
const WEIGHT_KINDS = 5;
const lists = array(nat(), { maxLength: LIST_MAX });

function ascending(first: number, second: number): number {
  return first - second;
}

describe('seededPicks', () => {
  test('the same seed and call order give the same picks', () => {
    assert(
      property(seeds, array(bounds, { maxLength: LIST_MAX }), (seed, sequence) => {
        const first = seededPicks(seed);
        const second = seededPicks(seed);
        const firstPicks = sequence.map((bound) => first.below(bound));
        const secondPicks = sequence.map((bound) => second.below(bound));
        return firstPicks.join(',') === secondPicks.join(',');
      }),
    );
  });

  test('a pick is always inside its bound', () => {
    assert(
      property(seeds, array(bounds, { minLength: 1, maxLength: LIST_MAX }), (seed, sequence) => {
        const source = seededPicks(seed);
        return sequence.every((bound) => source.below(bound) < bound);
      }),
    );
  });

  test('the same seed picks, weighs and shuffles the same', () => {
    assert(
      property(seeds, lists, (seed, items) => {
        const entries = items.map((item) => ({ item, weight: PickWeight.parse(item % WEIGHT_KINDS) }));
        const run = (): string => {
          const source = seededPicks(seed);
          return JSON.stringify([pickOne(source, items), pickWeighted(source, entries), shuffle(source, items)]);
        };
        const first = run();
        const second = run();
        return first === second;
      }),
    );
  });

  test('a shuffle is a permutation', () => {
    assert(
      property(seeds, lists, (seed, items) => {
        const shuffled = shuffle(seededPicks(seed), items);
        return shuffled.toSorted(ascending).join(',') === items.toSorted(ascending).join(',');
      }),
    );
  });
});
